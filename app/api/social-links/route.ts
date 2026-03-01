import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const data = await prisma.social_links.findMany({
            orderBy: { created_at: 'asc' },
        });
        const response = NextResponse.json(data);
        response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
        return response;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
