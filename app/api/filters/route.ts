import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const [categories, levels, mediaTypes] = await Promise.all([
            prisma.categories.findMany({ orderBy: { name: 'asc' } }),
            prisma.levels.findMany({ orderBy: { name: 'asc' } }),
            prisma.media_types.findMany({ orderBy: { name: 'asc' } }),
        ]);

        const response = NextResponse.json({
            categories,
            levels,
            mediaTypes,
        });
        response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
        return response;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
