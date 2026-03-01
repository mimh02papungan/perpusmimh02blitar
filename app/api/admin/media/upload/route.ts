import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/auth';
import { buildStorageObjectAccessPath, uploadObjectToR2 } from '@/lib/r2';
import { assertStorageQuota, createStorageObject } from '@/lib/storageObjects';
import { notifyNewPublicMedia } from '@/lib/webPush';

const MAX_UPLOAD_SIZE = 500 * 1024 * 1024;
const MAX_PINNED_MEDIA = 6;

function toPositiveInt(value: FormDataEntryValue | null): number | null {
    if (typeof value !== 'string') return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function toBoolean(value: FormDataEntryValue | null): boolean {
    if (typeof value !== 'string') return false;
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function normalizeSourceType(value: FormDataEntryValue | null): 'file' | 'link' {
    if (typeof value !== 'string') return 'file';
    return value.trim().toLowerCase() === 'link' ? 'link' : 'file';
}

export async function POST(request: NextRequest) {
    const auth = await requireAdminSession(request);
    if (!auth.ok) return auth.response as NextResponse;

    try {
        const formData = await request.formData();

        const file = formData.get('file');
        const thumbnailValue = formData.get('thumbnail');
        const title = String(formData.get('title') || '').trim();
        const description = String(formData.get('description') || '').trim();
        const categoryId = toPositiveInt(formData.get('category_id'));
        const mediaTypeId =
            toPositiveInt(formData.get('media_type_id')) || toPositiveInt(formData.get('media_type'));
        const levelId = toPositiveInt(formData.get('level_id'));
        const visibility = String(formData.get('visibility') || 'public').toLowerCase();
        const sourceType = normalizeSourceType(formData.get('source_type'));
        const externalUrl = String(formData.get('external_url') || '').trim();
        const isPinned = toBoolean(formData.get('is_pinned'));

        const thumbnailFile = thumbnailValue instanceof File && thumbnailValue.size > 0
            ? thumbnailValue
            : null;

        if (!title || !categoryId || !mediaTypeId || !levelId) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        if (thumbnailFile && thumbnailFile.size > MAX_UPLOAD_SIZE) {
            return NextResponse.json(
                { success: false, error: 'Ukuran thumbnail melebihi batas 500MB' },
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
            if (!externalUrl) {
                return NextResponse.json(
                    { success: false, error: 'Link URL wajib diisi untuk media bertipe link' },
                    { status: 400 }
                );
            }

            try {
                new URL(externalUrl);
            } catch {
                return NextResponse.json(
                    { success: false, error: 'Format link URL tidak valid' },
                    { status: 400 }
                );
            }

            if (!thumbnailFile) {
                return NextResponse.json(
                    { success: false, error: 'Thumbnail/foto wajib diunggah untuk media bertipe link' },
                    { status: 400 }
                );
            }

            await assertStorageQuota(thumbnailFile.size);

            const thumbnailUpload = await uploadObjectToR2({
                data: Buffer.from(await thumbnailFile.arrayBuffer()),
                contentType: thumbnailFile.type || undefined,
                folder: 'thumbnails',
                filename: thumbnailFile.name,
            });
            const thumbnailObject = await createStorageObject({
                bucket: thumbnailUpload.bucket,
                objectKey: thumbnailUpload.objectKey,
                mimeType: thumbnailFile.type || null,
                sizeBytes: thumbnailFile.size,
                etag: thumbnailUpload.etag,
                isPublic: false,
            });

            const media = await prisma.learning_media.create({
                data: {
                    title,
                    description: description || null,
                    source_type: 'link',
                    external_url: externalUrl,
                    file_url: externalUrl,
                    thumbnail_url: buildStorageObjectAccessPath(thumbnailObject.id),
                    category_id: categoryId,
                    media_type_id: mediaTypeId,
                    level_id: levelId,
                    visibility: visibility === 'private' ? 'private' : 'public',
                    is_pinned: isPinned,
                    pinned_at: isPinned ? new Date() : null,
                    file_object_id: null,
                    thumbnail_object_id: thumbnailObject.id,
                    updated_at: new Date(),
                },
                include: {
                    categories: { select: { id: true, name: true } },
                    media_types: { select: { id: true, name: true, icon: true } },
                    levels: { select: { id: true, name: true } },
                },
            });
            if (media.visibility !== 'private') {
                notifyNewPublicMedia({
                    id: media.id,
                    title: media.title,
                    mediaTypeName: media.media_types?.name,
                }).catch((error) => {
                    console.error('Failed to send new media push notification', error);
                });
            }

            return NextResponse.json({
                success: true,
                data: {
                    ...media,
                    file_object_id: media.file_object_id?.toString() || null,
                    thumbnail_object_id: media.thumbnail_object_id?.toString() || null,
                },
                message: 'Media link berhasil ditambahkan',
            });
        }

        if (!(file instanceof File)) {
            return NextResponse.json({ success: false, error: 'File is required' }, { status: 400 });
        }

        if (file.size > MAX_UPLOAD_SIZE) {
            return NextResponse.json(
                { success: false, error: 'Ukuran file melebihi batas 500MB' },
                { status: 400 }
            );
        }

        await assertStorageQuota(file.size + (thumbnailFile?.size || 0));

        const fileUpload = await uploadObjectToR2({
            data: Buffer.from(await file.arrayBuffer()),
            contentType: file.type || undefined,
            folder: 'media',
            filename: file.name,
        });
        const fileObject = await createStorageObject({
            bucket: fileUpload.bucket,
            objectKey: fileUpload.objectKey,
            mimeType: file.type || null,
            sizeBytes: file.size,
            etag: fileUpload.etag,
            isPublic: false,
        });

        let thumbnailObjectId: bigint | null = null;
        let thumbnailUrl = buildStorageObjectAccessPath(fileObject.id);

        if (thumbnailFile) {
            const thumbnailUpload = await uploadObjectToR2({
                data: Buffer.from(await thumbnailFile.arrayBuffer()),
                contentType: thumbnailFile.type || undefined,
                folder: 'thumbnails',
                filename: thumbnailFile.name,
            });
            const thumbnailObject = await createStorageObject({
                bucket: thumbnailUpload.bucket,
                objectKey: thumbnailUpload.objectKey,
                mimeType: thumbnailFile.type || null,
                sizeBytes: thumbnailFile.size,
                etag: thumbnailUpload.etag,
                isPublic: false,
            });
            thumbnailObjectId = thumbnailObject.id;
            thumbnailUrl = buildStorageObjectAccessPath(thumbnailObject.id);
        }

        const media = await prisma.learning_media.create({
            data: {
                title,
                description: description || null,
                source_type: 'file',
                external_url: null,
                file_url: buildStorageObjectAccessPath(fileObject.id),
                thumbnail_url: thumbnailUrl,
                category_id: categoryId,
                media_type_id: mediaTypeId,
                level_id: levelId,
                visibility: visibility === 'private' ? 'private' : 'public',
                is_pinned: isPinned,
                pinned_at: isPinned ? new Date() : null,
                file_object_id: fileObject.id,
                thumbnail_object_id: thumbnailObjectId || fileObject.id,
                updated_at: new Date(),
            },
            include: {
                categories: { select: { id: true, name: true } },
                media_types: { select: { id: true, name: true, icon: true } },
                levels: { select: { id: true, name: true } },
            },
        });
        if (media.visibility !== 'private') {
            notifyNewPublicMedia({
                id: media.id,
                title: media.title,
                mediaTypeName: media.media_types?.name,
            }).catch((error) => {
                console.error('Failed to send new media push notification', error);
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                ...media,
                file_object_id: media.file_object_id?.toString() || null,
                thumbnail_object_id: media.thumbnail_object_id?.toString() || null,
            },
            message: 'Media uploaded successfully',
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Upload failed';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}


