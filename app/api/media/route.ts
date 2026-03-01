import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapMediaWithStorageUrls } from '@/lib/mappers';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.nextUrl);
    const categoryName = searchParams.get('category');
    const mediaTypeName = searchParams.get('media_type');
    const levelName = searchParams.get('level');
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10));
    const limit = 20;

    try {
        let categoryId: number | null = null;
        let mediaTypeId: number | null = null;
        let levelId: number | null = null;

        if (categoryName && categoryName !== 'semua') {
            const category = await prisma.categories.findFirst({
                where: { name: { equals: categoryName, mode: 'insensitive' } },
                select: { id: true },
            });
            categoryId = category?.id ?? null;
        }

        if (mediaTypeName && mediaTypeName !== 'semua') {
            const mediaType = await prisma.media_types.findFirst({
                where: { name: { equals: mediaTypeName, mode: 'insensitive' } },
                select: { id: true },
            });
            mediaTypeId = mediaType?.id ?? null;
        }

        if (levelName && levelName !== 'semua') {
            const level = await prisma.levels.findFirst({
                where: { name: { equals: levelName, mode: 'insensitive' } },
                select: { id: true },
            });
            levelId = level?.id ?? null;
        }

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
            total,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
        });
        response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
        return response;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
