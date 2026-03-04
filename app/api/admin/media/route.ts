import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/auth';
import { mapMediaWithStorageUrls } from '@/lib/mappers';
import { buildStorageObjectAccessPath } from '@/lib/r2';
import { notifyNewPublicMedia } from '@/lib/webPush';

const MAX_PINNED_MEDIA = 6;

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

function parseBigIntOrNull(value: unknown): bigint | null {
    if (value === null || value === undefined || value === '') return null;
    try {
        const result = BigInt(String(value));
        return result > BigInt(0) ? result : null;
    } catch {
        return null;
    }
}

function parseBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value !== 'string') return false;
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function normalizeSourceType(value: unknown): 'file' | 'link' {
    if (typeof value !== 'string') return 'file';
    return value.trim().toLowerCase() === 'link' ? 'link' : 'file';
}

function normalizeVisibility(value: unknown): 'public' | 'private' {
    if (typeof value !== 'string') return 'public';
    return value.trim().toLowerCase() === 'private' ? 'private' : 'public';
}

function isValidHttpUrl(value: string): boolean {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

export async function GET(request: NextRequest) {
    const auth = await requireAdminSession(request);
    if (!auth.ok) return auth.response as NextResponse;

    try {
        const { searchParams } = new URL(request.url);
        const limit = Number(searchParams.get('limit') || '100');

        const data = await prisma.learning_media.findMany({
            take: Math.min(limit, 1000),
            orderBy: { created_at: 'desc' },
            include: {
                categories: { select: { id: true, name: true } },
                media_types: { select: { id: true, name: true, icon: true } },
                levels: { select: { id: true, name: true } },
                file_object: { select: { bucket: true, object_key: true } },
                thumbnail_object: { select: { bucket: true, object_key: true } },
            },
        });

        return NextResponse.json({
            success: true,
            data: data.map(mapMediaWithStorageUrls),
            total: data.length,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const auth = await requireAdminSession(request);
    if (!auth.ok) return auth.response as NextResponse;

    try {
        const json = await request.json().catch(() => null);
        if (!json || typeof json !== 'object') {
            return NextResponse.json(
                { success: false, error: 'Body tidak valid' },
                { status: 400 }
            );
        }

        const title = String((json as { title?: unknown }).title || '').trim();
        const description = String((json as { description?: unknown }).description || '').trim();
        const categoryId = parsePositiveInt((json as { category_id?: unknown }).category_id);
        const levelId = parsePositiveInt((json as { level_id?: unknown }).level_id);
        const mediaTypeId =
            parsePositiveInt((json as { media_type_id?: unknown }).media_type_id) ||
            parsePositiveInt((json as { media_type?: unknown }).media_type);
        const visibility = normalizeVisibility((json as { visibility?: unknown }).visibility);
        const sourceType = normalizeSourceType((json as { source_type?: unknown }).source_type);
        const externalUrl = String((json as { external_url?: unknown }).external_url || '').trim();
        const isPinned = parseBoolean((json as { is_pinned?: unknown }).is_pinned);

        const fileObjectId = parseBigIntOrNull((json as { file_object_id?: unknown }).file_object_id);
        const thumbnailObjectIdRaw = parseBigIntOrNull(
            (json as { thumbnail_object_id?: unknown }).thumbnail_object_id
        );

        if (!title || !categoryId || !levelId || !mediaTypeId) {
            return NextResponse.json(
                { success: false, error: 'Judul, kategori, tingkatan, dan jenis media wajib diisi' },
                { status: 400 }
            );
        }

        if (isPinned) {
            const pinnedCount = await prisma.learning_media.count({
                where: { is_pinned: true },
            });
            if (pinnedCount >= MAX_PINNED_MEDIA) {
                return NextResponse.json(
                    { success: false, error: `Maksimal pin hanya ${MAX_PINNED_MEDIA} media` },
                    { status: 400 }
                );
            }
        }

        if (sourceType === 'link') {
            if (!externalUrl || !isValidHttpUrl(externalUrl)) {
                return NextResponse.json(
                    { success: false, error: 'URL link wajib valid (http/https)' },
                    { status: 400 }
                );
            }

            if (fileObjectId) {
                return NextResponse.json(
                    { success: false, error: 'Media link tidak boleh memiliki file_object_id' },
                    { status: 400 }
                );
            }

            if (!thumbnailObjectIdRaw) {
                return NextResponse.json(
                    { success: false, error: 'Thumbnail/foto wajib diunggah untuk media bertipe link' },
                    { status: 400 }
                );
            }

            const thumbnailUrl = buildStorageObjectAccessPath(thumbnailObjectIdRaw);
            const created = await prisma.learning_media.create({
                data: {
                    title,
                    description: description || null,
                    source_type: 'link',
                    external_url: externalUrl,
                    file_url: externalUrl,
                    thumbnail_url: thumbnailUrl,
                    category_id: categoryId,
                    level_id: levelId,
                    media_type_id: mediaTypeId,
                    visibility,
                    is_pinned: isPinned,
                    pinned_at: isPinned ? new Date() : null,
                    file_object_id: null,
                    thumbnail_object_id: thumbnailObjectIdRaw,
                    updated_at: new Date(),
                },
                include: {
                    categories: { select: { id: true, name: true } },
                    media_types: { select: { id: true, name: true, icon: true } },
                    levels: { select: { id: true, name: true } },
                    file_object: { select: { bucket: true, object_key: true } },
                    thumbnail_object: { select: { bucket: true, object_key: true } },
                },
            });

            if (created.visibility !== 'private') {
                notifyNewPublicMedia({
                    id: created.id,
                    title: created.title,
                    mediaTypeName: created.media_types?.name,
                }).catch((error) => {
                    console.error('Failed to send new media push notification', error);
                });
            }

            return NextResponse.json({ success: true, data: mapMediaWithStorageUrls(created) });
        }

        if (!fileObjectId) {
            return NextResponse.json(
                { success: false, error: 'File utama wajib diunggah untuk media bertipe file' },
                { status: 400 }
            );
        }

        const thumbnailObjectId = thumbnailObjectIdRaw || fileObjectId;
        const created = await prisma.learning_media.create({
            data: {
                title,
                description: description || null,
                source_type: 'file',
                external_url: null,
                file_url: buildStorageObjectAccessPath(fileObjectId),
                thumbnail_url: buildStorageObjectAccessPath(thumbnailObjectId),
                category_id: categoryId,
                level_id: levelId,
                media_type_id: mediaTypeId,
                visibility,
                is_pinned: isPinned,
                pinned_at: isPinned ? new Date() : null,
                file_object_id: fileObjectId,
                thumbnail_object_id: thumbnailObjectId,
                updated_at: new Date(),
            },
            include: {
                categories: { select: { id: true, name: true } },
                media_types: { select: { id: true, name: true, icon: true } },
                levels: { select: { id: true, name: true } },
                file_object: { select: { bucket: true, object_key: true } },
                thumbnail_object: { select: { bucket: true, object_key: true } },
            },
        });

        if (created.visibility !== 'private') {
            notifyNewPublicMedia({
                id: created.id,
                title: created.title,
                mediaTypeName: created.media_types?.name,
            }).catch((error) => {
                console.error('Failed to send new media push notification', error);
            });
        }

        return NextResponse.json({ success: true, data: mapMediaWithStorageUrls(created) });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

