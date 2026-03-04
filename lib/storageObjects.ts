import { prisma } from '@/lib/prisma';
import { buildStorageObjectAccessPath, deleteObjectFromR2, isR2PrivateMode } from '@/lib/r2';

export const STORAGE_LIMIT_BYTES = Math.floor(6.5 * 1024 * 1024 * 1024);

type StorageObjectRow = {
    id: bigint;
    provider: string;
    bucket: string;
    object_key: string;
    mime_type: string | null;
    size_bytes: bigint | null;
    etag: string | null;
    is_public: boolean;
};

export function mapStorageObject(storageObject: StorageObjectRow) {
    const accessUrl = buildStorageObjectAccessPath(storageObject.id);

    return {
        id: storageObject.id.toString(),
        provider: storageObject.provider,
        bucket: storageObject.bucket,
        object_key: storageObject.object_key,
        mime_type: storageObject.mime_type,
        size_bytes: storageObject.size_bytes ? Number(storageObject.size_bytes) : null,
        etag: storageObject.etag,
        is_public: storageObject.is_public,
        access_url: accessUrl,
        public_url: accessUrl,
    };
}

export async function getTotalStorageUsageBytes(): Promise<number> {
    const aggregate = await prisma.storage_objects.aggregate({
        _sum: {
            size_bytes: true,
        },
    });

    return Number(aggregate._sum.size_bytes ?? 0);
}

export async function assertStorageQuota(requiredBytes: number | bigint) {
    const required = Number(requiredBytes);
    const used = await getTotalStorageUsageBytes();
    const nextUsage = used + required;

    if (nextUsage > STORAGE_LIMIT_BYTES) {
        throw new Error(
            `Kuota penyimpanan terlampaui. Terpakai ${(used / (1024 ** 3)).toFixed(
                2
            )} GB dari 6.5 GB.`
        );
    }
}

export async function createStorageObject(params: {
    bucket: string;
    objectKey: string;
    mimeType?: string;
    sizeBytes?: number;
    etag?: string | null;
    isPublic?: boolean;
}) {
    const created = await prisma.storage_objects.create({
        data: {
            provider: 'r2',
            bucket: params.bucket,
            object_key: params.objectKey,
            mime_type: params.mimeType ?? null,
            size_bytes: params.sizeBytes !== undefined ? BigInt(params.sizeBytes) : null,
            etag: params.etag ?? null,
            is_public: params.isPublic ?? !isR2PrivateMode(),
            updated_at: new Date(),
        },
    });

    return created;
}

export async function resolveStorageObjectUrl(objectId: bigint | number | string | null) {
    if (objectId === null || objectId === undefined || objectId === '') return null;
    return buildStorageObjectAccessPath(String(objectId));
}

export async function deleteStorageObjectById(objectId: bigint | number | string | null) {
    if (objectId === null || objectId === undefined || objectId === '') return;
    await cleanupStorageObjectIfUnused(objectId);
}

function parseBigIntOrNull(value: bigint | number | string | null): bigint | null {
    if (value === null || value === undefined || value === '') return null;
    try {
        return BigInt(String(value));
    } catch {
        return null;
    }
}

export async function cleanupStorageObjectIfUnused(objectId: bigint | number | string | null) {
    const parsedId = parseBigIntOrNull(objectId);
    if (!parsedId) return;

    const object = await prisma.storage_objects.findUnique({
        where: { id: parsedId },
        include: {
            _count: {
                select: {
                    admins_foto_object: true,
                    institutions_favicon_object: true,
                    institutions_logo_object: true,
                    institutions_og_image_object: true,
                    learning_media_file_object: true,
                    learning_media_thumbnail_object: true,
                },
            },
        },
    });

    if (!object) return;

    const usageCount =
        object._count.admins_foto_object +
        object._count.institutions_favicon_object +
        object._count.institutions_logo_object +
        object._count.institutions_og_image_object +
        object._count.learning_media_file_object +
        object._count.learning_media_thumbnail_object;

    if (usageCount > 0) return;

    await deleteObjectFromR2(object.bucket, object.object_key).catch(() => {
        // Object might already be missing, still cleanup DB row.
    });

    await prisma.storage_objects.delete({
        where: { id: parsedId },
    });
}

export async function forceDeleteStorageObject(objectId: bigint | number | string | null) {
    const parsedId = parseBigIntOrNull(objectId);
    if (!parsedId) return;

    const object = await prisma.storage_objects.findUnique({
        where: { id: parsedId },
        include: {
            _count: {
                select: {
                    admins_foto_object: true,
                    institutions_favicon_object: true,
                    institutions_logo_object: true,
                    institutions_og_image_object: true,
                    learning_media_file_object: true,
                    learning_media_thumbnail_object: true,
                },
            },
        },
    });

    if (!object) return;

    const usageCount =
        object._count.admins_foto_object +
        object._count.institutions_favicon_object +
        object._count.institutions_logo_object +
        object._count.institutions_og_image_object +
        object._count.learning_media_file_object +
        object._count.learning_media_thumbnail_object;

    if (usageCount > 0) return;

    await deleteObjectFromR2(object.bucket, object.object_key).catch(() => {
        // Forced delete ignores remote not-found / credentials errors.
    });

    await prisma.storage_objects.delete({
        where: { id: parsedId },
    }).catch(() => {
        // Ignore FK/race conditions on forced cleanup.
    });
}
