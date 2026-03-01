import fs from 'node:fs';
import { Client } from 'pg';

type EnvMap = Record<string, string>;

function loadEnv(path: string): EnvMap {
  const env: EnvMap = {};
  if (!fs.existsSync(path)) return env;

  for (const line of fs.readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let value = m[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[m[1]] = value;
  }

  return env;
}

function qIdent(name: string): string {
  return `"${name.replaceAll('"', '""')}"`;
}

async function main() {
  const env = { ...process.env, ...loadEnv('.env') };
  const sourceUrl = env.SUPABASE_DIRECT_URL;
  const targetUrl = env.NEON_DIRECT_URL || env.DATABASE_URL;

  if (!sourceUrl) throw new Error('SUPABASE_DIRECT_URL is required');
  if (!targetUrl) throw new Error('NEON_DIRECT_URL or DATABASE_URL is required');

  const source = new Client({ connectionString: sourceUrl, ssl: { rejectUnauthorized: false } });
  const target = new Client({ connectionString: targetUrl, ssl: { rejectUnauthorized: false } });

  const tableOrder = [
    'admins',
    'categories',
    'institutions',
    'levels',
    'media_types',
    'social_links',
    'learning_media',
  ];

  const integerPkTables = ['categories', 'levels', 'media_types', 'learning_media'];

  await source.connect();
  await target.connect();

  try {
    for (const table of tableOrder) {
      const sourceRows = await source.query(`SELECT * FROM public.${qIdent(table)} ORDER BY 1`);
      const rows = sourceRows.rows;
      if (rows.length === 0) {
        console.log(`[${table}] no rows to migrate`);
        continue;
      }

      const columns = Object.keys(rows[0]);
      const nonIdColumns = columns.filter((c) => c !== 'id');
      const columnList = columns.map(qIdent).join(', ');
      const updateSet =
        nonIdColumns.length > 0
          ? nonIdColumns.map((c) => `${qIdent(c)} = EXCLUDED.${qIdent(c)}`).join(', ')
          : qIdent('id') + ' = EXCLUDED.' + qIdent('id');

      let migrated = 0;
      for (const row of rows) {
        const values = columns.map((c) => row[c]);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        const sql = `
          INSERT INTO public.${qIdent(table)} (${columnList})
          VALUES (${placeholders})
          ON CONFLICT (${qIdent('id')})
          DO UPDATE SET ${updateSet}
        `;
        await target.query(sql, values);
        migrated += 1;
      }

      console.log(`[${table}] migrated ${migrated} rows`);
    }

    for (const table of integerPkTables) {
      const resetSql = `
        SELECT setval(
          pg_get_serial_sequence('public.${table}', 'id'),
          COALESCE((SELECT MAX(id) + 1 FROM public.${qIdent(table)}), 1),
          false
        )
      `;
      await target.query(resetSql);
      console.log(`[${table}] sequence reset`);
    }

    console.log('DB migration from Supabase to Neon finished successfully.');
  } finally {
    await source.end();
    await target.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
