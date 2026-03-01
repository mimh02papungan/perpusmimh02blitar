import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/auth';
import { STORAGE_LIMIT_BYTES, getTotalStorageUsageBytes } from '@/lib/storageObjects';

function bytesToGb(value: number) {
    return value / (1024 ** 3);
}

function getFolderName(objectKey: string) {
    const clean = objectKey.replace(/^\/+/, '');
    return clean.split('/')[0] || 'root';
}

export async function GET(request: NextRequest) {
    const auth = await requireAdminSession(request, { superadmin: true });
    if (!auth.ok) return auth.response as NextResponse;

    try {
        const [usedBytes, mediaRecords, objects] = await Promise.all([
            getTotalStorageUsageBytes(),
            prisma.learning_media.findMany({
                select: {
                    id: true,
                    title: true,
                    file_object: { select: { size_bytes: true } },
                    thumbnail_object: { select: { size_bytes: true } },
                },
            }),
            prisma.storage_objects.findMany({
                select: {
                    id: true,
                    object_key: true,
                    size_bytes: true,
                    mime_type: true,
                    created_at: true,
                },
                orderBy: { created_at: 'desc' },
            }),
        ]);

        const mediaUsage = mediaRecords
            .map((item) => {
                const fileSize = Number(item.file_object?.size_bytes ?? 0);
                const thumbSize = Number(item.thumbnail_object?.size_bytes ?? 0);
                return {
                    id: item.id,
                    title: item.title,
                    total_bytes: fileSize + thumbSize,
                };
            })
            .sort((a, b) => b.total_bytes - a.total_bytes)
            .slice(0, 10);

        const folderMap = new Map<string, number>();
        for (const object of objects) {
            const folder = getFolderName(object.object_key);
            const size = Number(object.size_bytes ?? 0);
            folderMap.set(folder, (folderMap.get(folder) || 0) + size);
        }

        const folderUsage = [...folderMap.entries()]
            .map(([folder, totalBytes]) => ({ folder, total_bytes: totalBytes }))
            .sort((a, b) => b.total_bytes - a.total_bytes);

        const remainingBytes = Math.max(0, STORAGE_LIMIT_BYTES - usedBytes);
        const usagePercent = STORAGE_LIMIT_BYTES === 0
            ? 0
            : Number(((usedBytes / STORAGE_LIMIT_BYTES) * 100).toFixed(2));

        return NextResponse.json({
            success: true,
            data: {
                limit_bytes: STORAGE_LIMIT_BYTES,
                used_bytes: usedBytes,
                remaining_bytes: remainingBytes,
                usage_percent: usagePercent,
                used_gb: Number(bytesToGb(usedBytes).toFixed(2)),
                limit_gb: Number(bytesToGb(STORAGE_LIMIT_BYTES).toFixed(2)),
                object_count: objects.length,
                media_count: mediaRecords.length,
                top_media_by_size: mediaUsage,
                folder_usage: folderUsage,
                newest_objects: objects.slice(0, 20).map((object) => ({
                    id: object.id.toString(),
                    object_key: object.object_key,
                    size_bytes: Number(object.size_bytes ?? 0),
                    mime_type: object.mime_type,
                    created_at: object.created_at,
                })),
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}


