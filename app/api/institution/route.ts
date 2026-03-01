import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapInstitutionWithStorageUrls } from '@/lib/mappers';

export async function GET() {
    try {
        const data = await prisma.institutions.findFirst({
            orderBy: { created_at: 'desc' },
            include: {
                logo_object: { select: { bucket: true, object_key: true } },
                favicon_object: { select: { bucket: true, object_key: true } },
                og_image_object: { select: { bucket: true, object_key: true } },
            },
        });

        if (!data) {
            const empty = NextResponse.json({});
            empty.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
            return empty;
        }

        const response = NextResponse.json(mapInstitutionWithStorageUrls(data));
        response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
        return response;
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
