import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/auth';
import { forceDeleteStorageObject } from '@/lib/storageObjects';

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

        if (!name) {
            return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
        }

        const data = await prisma.levels.update({
            where: { id: Number(id) },
            data: { name },
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
        const levelId = Number.parseInt(id, 10);
        if (!Number.isInteger(levelId) || levelId <= 0) {
            return NextResponse.json(
                { success: false, error: 'ID tingkatan tidak valid' },
                { status: 400 }
            );
        }

        const exists = await prisma.levels.findUnique({
            where: { id: levelId },
            select: { id: true, name: true },
        });
        if (!exists) {
            return NextResponse.json(
                { success: false, error: 'Tingkatan tidak ditemukan' },
                { status: 404 }
            );
        }

        const childMedia = await prisma.learning_media.findMany({
            where: { level_id: levelId },
            select: {
                id: true,
                file_object_id: true,
                thumbnail_object_id: true,
            },
        });

        await prisma.$transaction(async (tx) => {
            await tx.learning_media.deleteMany({
                where: { level_id: levelId },
            });

            await tx.levels.delete({
                where: { id: levelId },
            });
        });

        const objectIds = new Set<string>();
        for (const media of childMedia) {
            if (media.file_object_id) objectIds.add(media.file_object_id.toString());
            if (media.thumbnail_object_id) objectIds.add(media.thumbnail_object_id.toString());
        }

        for (const objectId of objectIds) {
            await forceDeleteStorageObject(objectId);
        }

        return NextResponse.json({
            success: true,
            message: `Tingkatan "${exists.name}" dihapus. ${childMedia.length} media turunan ikut dihapus.`,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}


