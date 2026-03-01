import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

type EnvMap = Record<string, string>;

function loadEnv(filePath: string): EnvMap {
  const env: EnvMap = {};
  if (!fs.existsSync(filePath)) return env;

  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
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

function parseSupabasePublicObjectKey(fileUrl: string): string | null {
  try {
    const u = new URL(fileUrl);
    const marker = '/storage/v1/object/public/';
    const idx = u.pathname.indexOf(marker);
    if (idx < 0) return null;
    const rest = u.pathname.slice(idx + marker.length); // bucket/key
    const slash = rest.indexOf('/');
    if (slash < 0) return null;
    return decodeURIComponent(rest.slice(slash + 1));
  } catch {
    return null;
  }
}

function buildObjectKey(fileUrl: string, fallbackPrefix: string): string {
  const fromSupabase = parseSupabasePublicObjectKey(fileUrl);
  if (fromSupabase) return fromSupabase;

  try {
    const u = new URL(fileUrl);
    const base = path.basename(u.pathname) || 'file.bin';
    return `${fallbackPrefix}/${randomUUID()}-${base}`;
  } catch {
    return `${fallbackPrefix}/${randomUUID()}-file.bin`;
  }
}

async function uploadUrlToR2(
  s3: S3Client,
  bucket: string,
  objectKey: string,
  fileUrl: string
): Promise<{ mimeType: string | null; sizeBytes: number | null; etag: string | null }> {
  const res = await fetch(fileUrl);
  if (!res.ok) {
    throw new Error(`Failed downloading source file (${res.status}) from ${fileUrl}`);
  }

  const contentType = res.headers.get('content-type');
  const arrayBuf = await res.arrayBuffer();
  const body = Buffer.from(arrayBuf);

  const put = await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: body,
      ContentType: contentType || undefined,
    })
  );

  return {
    mimeType: contentType,
    sizeBytes: body.length,
    etag: put.ETag || null,
  };
}

async function upsertStorageObject(
  db: Client,
  provider: string,
  bucket: string,
  objectKey: string,
  mimeType: string | null,
  sizeBytes: number | null,
  etag: string | null
): Promise<string> {
  const sql = `
    INSERT INTO public.storage_objects
      (provider, bucket, object_key, mime_type, size_bytes, etag, is_public, created_at, updated_at)
    VALUES
      ($1, $2, $3, $4, $5, $6, true, now(), now())
    ON CONFLICT (provider, bucket, object_key)
    DO UPDATE SET
      mime_type = EXCLUDED.mime_type,
      size_bytes = EXCLUDED.size_bytes,
      etag = EXCLUDED.etag,
      updated_at = now()
    RETURNING id
  `;
  const result = await db.query(sql, [provider, bucket, objectKey, mimeType, sizeBytes, etag]);
  return result.rows[0].id;
}

function buildPublicUrl(base: string, objectKey: string): string {
  return `${base.replace(/\/+$/, '')}/${objectKey.replace(/^\/+/, '')}`;
}

async function main() {
  const env = { ...process.env, ...loadEnv('.env') };
  const neonUrl = env.NEON_DIRECT_URL || env.DATABASE_URL;
  const r2Endpoint = env.R2_S3_ENDPOINT;
  const r2AccessKey = env.R2_ACCESS_KEY_ID;
  const r2Secret = env.R2_SECRET_ACCESS_KEY;
  const r2Bucket = env.R2_BUCKET_MEDIA || env.R2_DEFAULT_BUCKET;
  const r2PublicBase = env.R2_PUBLIC_BASE_URL || '';

  if (!neonUrl) throw new Error('NEON_DIRECT_URL or DATABASE_URL is required');
  if (!r2Endpoint || !r2AccessKey || !r2Secret || !r2Bucket) {
    throw new Error('R2 credentials are incomplete');
  }

  const db = new Client({ connectionString: neonUrl, ssl: { rejectUnauthorized: false } });
  const s3 = new S3Client({
    region: 'auto',
    endpoint: r2Endpoint,
    credentials: {
      accessKeyId: r2AccessKey,
      secretAccessKey: r2Secret,
    },
  });

  await db.connect();

  const cache = new Map<string, string>(); // source URL -> storage_objects.id

  let uploaded = 0;
  let linked = 0;

  try {
    const mediaRows = await db.query(
      `SELECT id, file_url, thumbnail_url FROM public.learning_media ORDER BY id ASC`
    );

    for (const row of mediaRows.rows) {
      const mediaId = row.id as number;
      const fileUrl = row.file_url as string;
      const thumbUrl = row.thumbnail_url as string;

      let fileObjectId: string | null = null;
      let thumbObjectId: string | null = null;

      if (fileUrl) {
        if (cache.has(fileUrl)) {
          fileObjectId = cache.get(fileUrl)!;
        } else {
          const objectKey = buildObjectKey(fileUrl, 'media/files');
          const meta = await uploadUrlToR2(s3, r2Bucket, objectKey, fileUrl);
          fileObjectId = await upsertStorageObject(
            db,
            'r2',
            r2Bucket,
            objectKey,
            meta.mimeType,
            meta.sizeBytes,
            meta.etag
          );
          cache.set(fileUrl, fileObjectId);
          uploaded += 1;
        }
      }

      if (thumbUrl) {
        if (thumbUrl === fileUrl && fileObjectId) {
          thumbObjectId = fileObjectId;
        } else if (cache.has(thumbUrl)) {
          thumbObjectId = cache.get(thumbUrl)!;
        } else {
          const objectKey = buildObjectKey(thumbUrl, 'media/thumbnails');
          const meta = await uploadUrlToR2(s3, r2Bucket, objectKey, thumbUrl);
          thumbObjectId = await upsertStorageObject(
            db,
            'r2',
            r2Bucket,
            objectKey,
            meta.mimeType,
            meta.sizeBytes,
            meta.etag
          );
          cache.set(thumbUrl, thumbObjectId);
          uploaded += 1;
        }
      }

      await db.query(
        `UPDATE public.learning_media
         SET file_object_id = $1, thumbnail_object_id = $2
         WHERE id = $3`,
        [fileObjectId, thumbObjectId, mediaId]
      );

      if (r2PublicBase) {
        let newFileUrl: string | null = null;
        let newThumbUrl: string | null = null;
        if (fileUrl) {
          const fileKeyRes = await db.query(
            'SELECT object_key FROM public.storage_objects WHERE id = $1',
            [fileObjectId]
          );
          if (fileKeyRes.rows[0]?.object_key) {
            newFileUrl = buildPublicUrl(r2PublicBase, fileKeyRes.rows[0].object_key);
          }
        }
        if (thumbUrl) {
          const thumbKeyRes = await db.query(
            'SELECT object_key FROM public.storage_objects WHERE id = $1',
            [thumbObjectId]
          );
          if (thumbKeyRes.rows[0]?.object_key) {
            newThumbUrl = buildPublicUrl(r2PublicBase, thumbKeyRes.rows[0].object_key);
          }
        }
        await db.query(
          `UPDATE public.learning_media
           SET file_url = COALESCE($1, file_url),
               thumbnail_url = COALESCE($2, thumbnail_url)
           WHERE id = $3`,
          [newFileUrl, newThumbUrl, mediaId]
        );
      }

      linked += 1;
      console.log(`[learning_media:${mediaId}] linked file_object_id=${fileObjectId}, thumbnail_object_id=${thumbObjectId}`);
    }

    const instRows = await db.query(
      `SELECT id, logo_url FROM public.institutions ORDER BY created_at ASC`
    );

    for (const row of instRows.rows) {
      const instId = row.id as string;
      const logoUrl = row.logo_url as string | null;
      if (!logoUrl) continue;

      let logoObjectId: string;
      if (cache.has(logoUrl)) {
        logoObjectId = cache.get(logoUrl)!;
      } else {
        const objectKey = buildObjectKey(logoUrl, 'media/logos');
        const meta = await uploadUrlToR2(s3, r2Bucket, objectKey, logoUrl);
        logoObjectId = await upsertStorageObject(
          db,
          'r2',
          r2Bucket,
          objectKey,
          meta.mimeType,
          meta.sizeBytes,
          meta.etag
        );
        cache.set(logoUrl, logoObjectId);
        uploaded += 1;
      }

      if (r2PublicBase) {
        const keyRes = await db.query(
          'SELECT object_key FROM public.storage_objects WHERE id = $1',
          [logoObjectId]
        );
        const newLogoUrl = keyRes.rows[0]?.object_key
          ? buildPublicUrl(r2PublicBase, keyRes.rows[0].object_key)
          : null;

        await db.query(
          `UPDATE public.institutions
           SET logo_object_id = $1,
               logo_url = COALESCE($2, logo_url)
           WHERE id = $3`,
          [logoObjectId, newLogoUrl, instId]
        );
      } else {
        await db.query(
          `UPDATE public.institutions
           SET logo_object_id = $1
           WHERE id = $2`,
          [logoObjectId, instId]
        );
      }

      linked += 1;
      console.log(`[institutions:${instId}] linked logo_object_id=${logoObjectId}`);
    }

    console.log(`R2 migration complete. Uploaded objects: ${uploaded}, linked records: ${linked}`);
    if (!r2PublicBase) {
      console.log('R2_PUBLIC_BASE_URL is not set. URL columns are left unchanged (legacy fallback mode).');
    }
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
