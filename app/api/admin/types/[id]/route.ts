import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/auth';
import { cleanupStorageObjectIfUnused } from '@/lib/storageObjects';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAdminSession(request);
    if (!auth.ok) return auth.response as NextResponse;

    const { id } = await params;
    try {
        const json = await request.json();
        const name = String(json?.name || '').trim();
        const icon = String(json?.icon || '').trim() || null;

        if (!name) {
            return NextResponse.json(
                { success: false, error: 'Nama tipe media wajib diisi' },
                { status: 400 }
            );
        }

        const data = await prisma.media_types.update({
            where: { id: Number(id) },
            data: { name, icon },
        });

        return NextResponse.json({ success: true, data });
    } catch (error: unknown) {
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
        const mediaTypeId = Number(id);
        const childMedia = await prisma.learning_media.findMany({
            where: { media_type_id: mediaTypeId },
            select: {
                id: true,
                file_object_id: true,
                thumbnail_object_id: true,
            },
        });

        await prisma.learning_media.deleteMany({
            where: { media_type_id: mediaTypeId },
        });

        await prisma.media_types.delete({
            where: { id: mediaTypeId },
        });

        const objectIds = new Set<string>();
        for (const media of childMedia) {
            if (media.file_object_id) objectIds.add(media.file_object_id.toString());
            if (media.thumbnail_object_id) objectIds.add(media.thumbnail_object_id.toString());
        }

        for (const objectId of objectIds) {
            await cleanupStorageObjectIfUnused(objectId);
        }

        return NextResponse.json({
            success: true,
            message: `Tipe media dihapus. ${childMedia.length} media turunan ikut dihapus.`,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}


