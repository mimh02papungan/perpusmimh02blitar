import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/auth';
import { mapInstitutionWithStorageUrls } from '@/lib/mappers';

function parseBigIntOrNull(value: unknown): bigint | null {
    if (value === null || value === undefined || value === '') return null;
    try {
        return BigInt(String(value));
    } catch {
        return null;
    }
}

export async function GET(request: NextRequest) {
    const auth = await requireAdminSession(request);
    if (!auth.ok) return auth.response as NextResponse;

    try {
        const data = await prisma.institutions.findMany({
            orderBy: { created_at: 'desc' },
            include: {
                logo_object: { select: { bucket: true, object_key: true } },
                favicon_object: { select: { bucket: true, object_key: true } },
                og_image_object: { select: { bucket: true, object_key: true } },
            },
        });
        return NextResponse.json({ success: true, data: data.map(mapInstitutionWithStorageUrls) });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const auth = await requireAdminSession(request, { superadmin: true });
    if (!auth.ok) return auth.response as NextResponse;

    try {
        const json = await request.json();
        const name = String(json?.name || '').trim();

        if (!name) {
            return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
        }

        const logoObjectId = parseBigIntOrNull(json?.logo_object_id);
        const faviconObjectId = parseBigIntOrNull(json?.favicon_object_id);
        const ogImageObjectId = parseBigIntOrNull(json?.og_image_object_id);

        const existingInstitution = await prisma.institutions.findFirst({
            orderBy: { created_at: 'asc' },
            select: { id: true },
        });

        if (existingInstitution) {
            return NextResponse.json(
                { success: false, error: 'Institution already exists, gunakan endpoint update.' },
                { status: 400 }
            );
        }

        const data = await prisma.institutions.create({
            data: {
                name,
                description: json?.description ? String(json.description) : null,
                logo_url: null,
                logo_object_id: logoObjectId,
                favicon_object_id: faviconObjectId,
                seo_title: json?.seo_title ? String(json.seo_title) : null,
                seo_description: json?.seo_description ? String(json.seo_description) : null,
                seo_keywords: json?.seo_keywords ? String(json.seo_keywords) : null,
                canonical_url: json?.canonical_url ? String(json.canonical_url) : null,
                og_image_object_id: ogImageObjectId,
                og_type: json?.og_type ? String(json.og_type) : 'website',
                twitter_card: json?.twitter_card ? String(json.twitter_card) : 'summary_large_image',
                updated_at: new Date(),
            },
            include: {
                logo_object: { select: { bucket: true, object_key: true } },
                favicon_object: { select: { bucket: true, object_key: true } },
                og_image_object: { select: { bucket: true, object_key: true } },
            },
        });

        return NextResponse.json({ success: true, data: mapInstitutionWithStorageUrls(data) });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

