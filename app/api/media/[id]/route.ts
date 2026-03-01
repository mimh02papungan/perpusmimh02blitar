import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapMediaWithStorageUrls } from '@/lib/mappers';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const data = await prisma.learning_media.findFirst({
            where: {
                id: Number(id),
                visibility: 'public',
            },
            include: {
                categories: { select: { id: true, name: true } },
                media_types: { select: { id: true, name: true, icon: true } },
                levels: { select: { id: true, name: true } },
                file_object: { select: { bucket: true, object_key: true } },
                thumbnail_object: { select: { bucket: true, object_key: true } },
            },
        });

        if (!data) {
            return NextResponse.json(
                { success: false, message: 'Media not found' },
                { status: 404 }
            );
        }

        const response = NextResponse.json({
            success: true,
            data: mapMediaWithStorageUrls(data),
        });
        response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
        return response;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
