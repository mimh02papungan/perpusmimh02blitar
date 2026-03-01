# Perpus MI - Media Pembelajaran Digital

Aplikasi perpustakaan digital berbasis Next.js 16 untuk publik dan admin.

## Stack Utama
- Next.js 16 (App Router)
- TypeScript
- Prisma + PostgreSQL (Neon)
- Cloudflare R2 (file storage)
- Web Push (VAPID)
- next-sitemap (sitemap + robots)

## Cara Menjalankan dari GitHub

### 1. Clone repository
```bash
git clone <URL_REPOSITORY_KAMU>
cd "WEB PERPUS MI MH 02"
```

### 2. Install dependency
```bash
npm install
```

### 3. Siapkan environment
Copy template:
```bash
copy .env.example .env
```

Lalu isi semua nilai penting di `.env`.

### 4. Generate Prisma client
```bash
npm run prisma:generate
```

### 5. Sinkronkan schema database
Untuk database existing (umum dipakai di project ini):
```bash
npx prisma db push
```

Jika sudah pakai migration history rapi:
```bash
npx prisma migrate deploy
```

### 6. Jalankan development server
```bash
npm run dev
```

Buka `http://localhost:3000`.

## Environment Variables (API Key/Secret)

Berikut daftar key yang dipakai project.

### Wajib untuk runtime aplikasi
- `DATABASE_URL`: koneksi PostgreSQL aktif untuk Prisma.
- `ADMIN_JWT_SECRET`: secret signing token admin.
- `R2_ACCOUNT_ID`
- `R2_S3_ENDPOINT`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_DEFAULT_BUCKET`
- `R2_BUCKET_MEDIA`
- `R2_ACCESS_MODE` (`private`/`public`)
- `R2_SIGNED_URL_TTL_SECONDS`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `WEB_PUSH_VAPID_PRIVATE_KEY`
- `WEB_PUSH_VAPID_SUBJECT`

### Direkomendasikan
- `ANALYTICS_HASH_SALT`: salt untuk hash IP pada event statistik.
- `NEXT_PUBLIC_SITE_URL`: domain publik utama (dipakai metadata + sitemap).
- `SITE_URL`: fallback domain untuk sitemap/metadata.
- `R2_PUBLIC_BASE_URL`: diperlukan jika mode public URL dipakai.

### Khusus migrasi data (opsional)
- `SUPABASE_DATABASE_URL`
- `SUPABASE_DIRECT_URL`
- `NEON_DATABASE_URL`
- `NEON_DIRECT_URL`
- `DIRECT_URL`
- `R2_API_TOKEN`

## Script Penting
- `npm run dev`: jalankan mode development.
- `npm run build`: build production + generate sitemap.
- `npm run start`: jalankan server production.
- `npm run lint`: lint codebase.
- `npm run prisma:generate`: generate Prisma client.
- `npm run prisma:push`: push schema ke DB (accept data loss).
- `npm run sitemap`: generate `public/sitemap*.xml` dan `public/robots.txt`.
- `npm run migrate:db`: script migrasi DB Supabase ke Neon.
- `npm run migrate:r2`: script migrasi file ke R2.

## Web Push Setup Singkat
1. Generate VAPID key:
```bash
npx web-push generate-vapid-keys
```
2. Isi:
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `WEB_PUSH_VAPID_PRIVATE_KEY`
- `WEB_PUSH_VAPID_SUBJECT`

## Catatan Deploy
- Deploy di Vercel: pastikan semua env di atas sudah diisi di Project Settings.
- Setelah deploy, jalankan ulang sitemap bila perlu melalui build (`postbuild` sudah otomatis).
- Untuk TWA/PWA production, pastikan domain sudah HTTPS dan manifest bisa diakses.
