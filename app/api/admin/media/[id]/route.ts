import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/auth';
import { mapMediaWithStorageUrls } from '@/lib/mappers';
import { cleanupStorageObjectIfUnused } from '@/lib/storageObjects';
import { buildStorageObjectAccessPath } from '@/lib/r2';
import { notifyPinnedMedia } from '@/lib/webPush';

const MAX_PINNED_MEDIA = 6;

function parseBigIntOrNull(value: unknown): bigint | null {
    if (value === null || value === undefined || value === '') return null;
    try {
        return BigInt(String(value));
    } catch {
        return null;
    }
}

function normalizeSourceType(value: unknown): 'file' | 'link' {
    if (typeof value !== 'string') return 'file';
    return value.trim().toLowerCase() === 'link' ? 'link' : 'file';
}

function parseBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') return false;
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function parseNonNegativeInt(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value >= 0 ? Math.floor(value) : null;
    }
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number.parseInt(value, 10);
        if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    }
    return null;
}

function parsePositiveInt(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value > 0 ? Math.floor(value) : null;
    }
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number.parseInt(value, 10);
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    return null;
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAdminSession(request);
    if (!auth.ok) return auth.response as NextResponse;

    const { id } = await params;
    try {
        const json = await request.json();
        const mediaId = Number(id);
        const existing = await prisma.learning_media.findUnique({
            where: { id: mediaId },
            select: {
                file_url: true,
                file_object_id: true,
                thumbnail_object_id: true,
                source_type: true,
                external_url: true,
                is_pinned: true,
                pinned_at: true,
            },
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: 'Media not found' }, { status: 404 });
        }

        const data: Record<string, unknown> = { updated_at: new Date() };
        if (json.title !== undefined) {
            const nextTitle = String(json.title || '').trim();
            if (!nextTitle) {
                return NextResponse.json(
                    { success: false, error: 'Judul wajib diisi' },
                    { status: 400 }
                );
            }
            data.title = nextTitle;
        }
        if (json.description !== undefined) data.description = json.description ? String(json.description) : null;
        if (json.category_id !== undefined) {
            const parsed = parsePositiveInt(json.category_id);
            if (parsed === null) {
                return NextResponse.json(
                    { success: false, error: 'Kategori tidak valid' },
                    { status: 400 }
                );
            }
            data.category_id = parsed;
        }
        if (json.level_id !== undefined) {
            const parsed = parsePositiveInt(json.level_id);
            if (parsed === null) {
                return NextResponse.json(
                    { success: false, error: 'Tingkatan tidak valid' },
                    { status: 400 }
                );
            }
            data.level_id = parsed;
        }
        if (json.media_type_id !== undefined) {
            const parsed = parsePositiveInt(json.media_type_id);
            if (parsed === null) {
                return NextResponse.json(
                    { success: false, error: 'Jenis media tidak valid' },
                    { status: 400 }
                );
            }
            data.media_type_id = parsed;
        }
        if (json.view_count !== undefined) {
            const parsedViewCount = parseNonNegativeInt(json.view_count);
            if (parsedViewCount === null) {
                return NextResponse.json(
                    { success: false, error: 'view_count harus berupa angka >= 0' },
                    { status: 400 }
                );
            }
            data.view_count = parsedViewCount;
        }
        if (json.download_count !== undefined) {
            const parsedDownloadCount = parseNonNegativeInt(json.download_count);
            if (parsedDownloadCount === null) {
                return NextResponse.json(
                    { success: false, error: 'download_count harus berupa angka >= 0' },
                    { status: 400 }
                );
            }
            data.download_count = parsedDownloadCount;
        }
        if (json.visibility !== undefined) {
            const value = String(json.visibility).toLowerCase();
            data.visibility = value === 'private' ? 'private' : 'public';
        }
        if (json.is_pinned !== undefined) {
            const shouldPin = parseBoolean(json.is_pinned);
            if (shouldPin && !existing.is_pinned) {
                const pinnedCount = await prisma.learning_media.count({
                    where: {
                        is_pinned: true,
                        id: { not: mediaId },
                    },
                });
                if (pinnedCount >= MAX_PINNED_MEDIA) {
                    return NextResponse.json(
                        { success: false, error: `Maksimal pin hanya ${MAX_PINNED_MEDIA} media` },
                        { status: 400 }
                    );
                }
            }
            data.is_pinned = shouldPin;
            data.pinned_at = shouldPin ? (existing.pinned_at || new Date()) : null;
        }

        const nextSourceType =
            json.source_type !== undefined
                ? normalizeSourceType(json.source_type)
                : normalizeSourceType(existing.source_type);

        if (json.source_type !== undefined) {
            data.source_type = nextSourceType;
        }

        if (json.file_object_id !== undefined) {
            const nextFileObjectId = parseBigIntOrNull(json.file_object_id);
            data.file_object_id = nextFileObjectId;
            if (nextFileObjectId) {
                data.file_url = buildStorageObjectAccessPath(nextFileObjectId);
            }

            if (
                json.thumbnail_object_id === undefined &&
                existing.file_object_id &&
                existing.thumbnail_object_id &&
                existing.file_object_id === existing.thumbnail_object_id
            ) {
                data.thumbnail_object_id = nextFileObjectId;
                if (nextFileObjectId) {
                    data.thumbnail_url = buildStorageObjectAccessPath(nextFileObjectId);
                }
            }
        }

        let nextExternalUrl =
            json.external_url !== undefined
                ? String(json.external_url || '').trim()
                : (nextSourceType === 'link'
                    ? (existing.external_url || existing.file_url || '')
                    : (existing.external_url || ''));

        if (json.external_url !== undefined) {
            if (!nextExternalUrl) {
                nextExternalUrl = '';
            } else {
                try {
                    new URL(nextExternalUrl);
                } catch {
                    return NextResponse.json(
                        { success: false, error: 'Format link URL tidak valid' },
                        { status: 400 }
                    );
                }
            }
            data.external_url = nextExternalUrl || null;
        }

        if (json.thumbnail_object_id !== undefined) {
            const nextThumbnailObjectId = parseBigIntOrNull(json.thumbnail_object_id);
            data.thumbnail_object_id = nextThumbnailObjectId;
            if (nextThumbnailObjectId) {
                data.thumbnail_url = buildStorageObjectAccessPath(nextThumbnailObjectId);
            }
        }

        if (nextSourceType === 'link') {
            if (!nextExternalUrl) {
                return NextResponse.json(
                    { success: false, error: 'Link URL wajib diisi untuk media bertipe link' },
                    { status: 400 }
                );
            }
            if (existing.file_object_id && json.file_object_id === undefined) {
                data.file_object_id = null;
            }
            data.external_url = nextExternalUrl;
            data.file_url = nextExternalUrl;
        } else {
            data.external_url = null;
            const hasExistingFile = Boolean(existing.file_object_id) || Boolean(existing.file_url);
            if (!hasExistingFile && data.file_object_id === undefined) {
                return NextResponse.json(
                    { success: false, error: 'File utama wajib diisi untuk media bertipe file' },
                    { status: 400 }
                );
            }
        }

        const updated = await prisma.learning_media.update({
            where: { id: mediaId },
            data: data as never,
            include: {
                categories: { select: { id: true, name: true } },
                media_types: { select: { id: true, name: true, icon: true } },
                levels: { select: { id: true, name: true } },
                file_object: { select: { bucket: true, object_key: true } },
                thumbnail_object: { select: { bucket: true, object_key: true } },
            },
        });

        if (existing.file_object_id && existing.file_object_id !== updated.file_object_id) {
            await cleanupStorageObjectIfUnused(existing.file_object_id);
        }
        if (
            existing.thumbnail_object_id &&
            existing.thumbnail_object_id !== updated.thumbnail_object_id &&
            existing.thumbnail_object_id !== existing.file_object_id
        ) {
            await cleanupStorageObjectIfUnused(existing.thumbnail_object_id);
        }
        if (
            data.is_pinned === true &&
            !existing.is_pinned &&
            updated.visibility !== 'private'
        ) {
            notifyPinnedMedia({
                id: updated.id,
                title: updated.title,
            }).catch((error) => {
                console.error('Failed to send pinned media push notification', error);
            });
        }

        return NextResponse.json({ success: true, data: mapMediaWithStorageUrls(updated) });
    } catch (error: unknown) {
        const code = (error as { code?: string } | null)?.code;
        if (code === 'P2025') {
            return NextResponse.json({
                success: true,
                alreadyDeleted: true,
                message: 'Media sudah terhapus',
            });
        }
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAdminSession(request);
    if (!auth.ok) return auth.response as NextResponse;

    const { id } = await params;
    try {
        const mediaId = Number.parseInt(id, 10);
        if (!Number.isInteger(mediaId) || mediaId <= 0) {
            return NextResponse.json(
                { success: false, error: 'ID media tidak valid' },
                { status: 400 }
            );
        }

        const media = await prisma.learning_media.findUnique({
            where: { id: mediaId },
            select: {
                id: true,
                file_object_id: true,
                thumbnail_object_id: true,
            },
        });

        if (!media) {
            // Idempotent delete: treat missing row as already deleted (helps stale UI / concurrent delete).
            return NextResponse.json({
                success: true,
                alreadyDeleted: true,
                message: 'Media sudah terhapus',
            });
        }

        await prisma.learning_media.delete({
            where: { id: mediaId },
        });

        await cleanupStorageObjectIfUnused(media.file_object_id);
        if (media.thumbnail_object_id !== media.file_object_id) {
            await cleanupStorageObjectIfUnused(media.thumbnail_object_id);
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

