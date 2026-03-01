import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapMediaWithStorageUrls } from '@/lib/mappers';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const searchQuery = (searchParams.get('search') || '').trim();
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10));
    const limit = 20;

    try {
        const where = {
            visibility: 'public',
            ...(searchQuery
                ? {
                    title: {
                        contains: searchQuery,
                        mode: 'insensitive' as const,
                    },
                }
                : {}),
        };

        const [data, total] = await Promise.all([
            prisma.learning_media.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { created_at: 'desc' },
                include: {
                    categories: { select: { id: true, name: true } },
                    media_types: { select: { id: true, name: true, icon: true } },
                    levels: { select: { id: true, name: true } },
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
                totalPages: Math.ceil(total / limit),
                currentPage: page,
            },
        });
        response.headers.set('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=300');
        return response;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
