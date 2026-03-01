import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/auth';
import { mapMediaWithStorageUrls } from '@/lib/mappers';

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

