import { randomBytes } from 'node:crypto';
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

type UploadPayload = {
    data: Buffer;
    contentType?: string;
    folder: string;
    filename: string;
};

const DEFAULT_BUCKET = process.env.R2_BUCKET_MEDIA || process.env.R2_DEFAULT_BUCKET || 'perpus';
const DEFAULT_SIGNED_URL_TTL = Number(process.env.R2_SIGNED_URL_TTL_SECONDS || '900');

function normalizeFolder(folder: string): string {
    const clean = folder.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    const firstSegment = clean.split('/').filter(Boolean)[0] || 'uploads';
    return firstSegment.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
}

function sanitizeFilename(filename: string): string {
    const clean = filename.trim().toLowerCase().replace(/\s+/g, '-');
    return clean.replace(/[^a-z0-9._-]/g, '-') || 'file.bin';
}

export function buildR2ObjectKey(folder: string, filename: string): string {
    const normalizedFolder = normalizeFolder(folder);
    const safeFilename = sanitizeFilename(filename);
    const stamp = Date.now();
    const nonce = randomBytes(4).toString('hex');
    return `${normalizedFolder}/${stamp}-${nonce}-${safeFilename}`;
}

let _client: S3Client | null = null;

function getR2Client(): S3Client {
    if (_client) return _client;

    const endpoint = process.env.R2_S3_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!endpoint || !accessKeyId || !secretAccessKey) {
        throw new Error('R2 credentials are incomplete');
    }

    _client = new S3Client({
        region: 'auto',
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
    });

    return _client;
}

export function getR2PublicUrl(bucket: string, objectKey: string): string {
    const key = objectKey.replace(/^\/+/, '');
    const customPublicBase = process.env.R2_PUBLIC_BASE_URL;
    if (customPublicBase) {
        return `${customPublicBase.replace(/\/+$/, '')}/${key}`;
    }

    const accountId = process.env.R2_ACCOUNT_ID;
    if (!accountId) {
        throw new Error('R2_ACCOUNT_ID is required when R2_PUBLIC_BASE_URL is not set');
    }

    return `https://${bucket}.${accountId}.r2.cloudflarestorage.com/${key}`;
}

function tryGetR2PublicUrl(bucket: string, objectKey: string): string | null {
    try {
        return getR2PublicUrl(bucket, objectKey);
    } catch {
        return null;
    }
}

export function isR2PrivateMode(): boolean {
    const mode = String(process.env.R2_ACCESS_MODE || 'private').toLowerCase();
    return mode !== 'public';
}

export function buildStorageObjectAccessPath(objectId: string | number | bigint): string {
    return `/api/storage/object/${String(objectId)}`;
}

export async function getR2ObjectAccessUrl(
    bucket: string,
    objectKey: string,
    options?: { expiresInSeconds?: number }
): Promise<string> {
    if (!isR2PrivateMode()) {
        return getR2PublicUrl(bucket, objectKey);
    }

    const client = getR2Client();
    const expiresIn = Number(options?.expiresInSeconds || DEFAULT_SIGNED_URL_TTL);
    return getSignedUrl(
        client,
        new GetObjectCommand({
            Bucket: bucket,
            Key: objectKey,
        }),
        {
            expiresIn: Number.isFinite(expiresIn) ? Math.max(60, expiresIn) : DEFAULT_SIGNED_URL_TTL,
        }
    );
}

export async function uploadObjectToR2(payload: UploadPayload) {
    const bucket = DEFAULT_BUCKET;
    const objectKey = buildR2ObjectKey(payload.folder, payload.filename);
    const client = getR2Client();

    const result = await client.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: objectKey,
            Body: payload.data,
            ContentType: payload.contentType,
        })
    );

    return {
        bucket,
        objectKey,
        etag: result.ETag ?? null,
        publicUrl: tryGetR2PublicUrl(bucket, objectKey),
    };
}

export async function deleteObjectFromR2(bucket: string, objectKey: string) {
    const client = getR2Client();
    await client.send(
        new DeleteObjectCommand({
            Bucket: bucket,
            Key: objectKey,
        })
    );
}
