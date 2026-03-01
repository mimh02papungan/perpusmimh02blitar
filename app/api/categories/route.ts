import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapMediaWithStorageUrls } from '@/lib/mappers';

function toInt(value: string | null): number | null {
    if (!value || value === 'all') return null;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const categoryId = toInt(searchParams.get('category'));
    const mediaTypeId = toInt(searchParams.get('media_type'));
    const levelId = toInt(searchParams.get('level'));
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10));
    const limit = 20;

    try {
        const where = {
            visibility: 'public',
            ...(categoryId ? { category_id: categoryId } : {}),
            ...(mediaTypeId ? { media_type_id: mediaTypeId } : {}),
            ...(levelId ? { level_id: levelId } : {}),
        };

        const [data, total] = await Promise.all([
            prisma.learning_media.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                    levels: { select: { id: true, name: true } },
                    categories: { select: { id: true, name: true } },
                    media_types: { select: { id: true, name: true, icon: true } },
                    file_object: { select: { bucket: true, object_key: true } },
                    thumbnail_object: { select: { bucket: true, object_key: true } },
                },
            }),
            prisma.learning_media.count({ where }),
        ]);

        const response = NextResponse.json({
            success: true,
            data: data.map(mapMediaWithStorageUrls),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
        response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
        return response;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST() {
    try {
        const [categories, levels, mediaTypes] = await Promise.all([
            prisma.categories.findMany({
                select: { id: true, name: true },
                orderBy: { name: 'asc' },
            }),
            prisma.levels.findMany({
                select: { id: true, name: true },
                orderBy: { name: 'asc' },
            }),
            prisma.media_types.findMany({
                select: { id: true, name: true, icon: true },
                orderBy: { name: 'asc' },
            }),
        ]);

        const response = NextResponse.json({
            success: true,
            filters: {
                categories,
                levels,
                mediaTypes,
            },
        });
        response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
        return response;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
