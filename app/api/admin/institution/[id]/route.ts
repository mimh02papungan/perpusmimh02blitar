import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/auth';
import { mapInstitutionWithStorageUrls } from '@/lib/mappers';
import { cleanupStorageObjectIfUnused } from '@/lib/storageObjects';

function parseBigIntOrNull(value: unknown): bigint | null {
    if (value === null || value === undefined || value === '') return null;
    try {
        return BigInt(String(value));
    } catch {
        return null;
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAdminSession(request, { superadmin: true });
    if (!auth.ok) return auth.response as NextResponse;

    const { id } = await params;
    try {
        const json = await request.json();
        const name = String(json?.name || '').trim();

        if (!name) {
            return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
        }

        const current = await prisma.institutions.findUnique({
            where: { id },
            select: {
                logo_object_id: true,
                favicon_object_id: true,
                og_image_object_id: true,
            },
        });

        if (!current) {
            return NextResponse.json({ success: false, error: 'Institution not found' }, { status: 404 });
        }

        const updates: Record<string, unknown> = {
            name,
            description: json?.description ? String(json.description) : null,
            seo_description: json?.seo_description ? String(json.seo_description) : null,
            seo_keywords: json?.seo_keywords ? String(json.seo_keywords) : null,
            canonical_url: json?.canonical_url ? String(json.canonical_url) : null,
            og_type: json?.og_type ? String(json.og_type) : 'website',
            twitter_card: json?.twitter_card ? String(json.twitter_card) : 'summary_large_image',
            updated_at: new Date(),
        };

        if (json?.seo_title !== undefined) {
            updates.seo_title = json.seo_title ? String(json.seo_title) : null;
        }

        if (json?.logo_object_id !== undefined) {
            const logoObjectId = parseBigIntOrNull(json.logo_object_id);
            updates.logo_object_id = logoObjectId;
            updates.logo_url = null;
        }

        if (json?.favicon_object_id !== undefined) {
            updates.favicon_object_id = parseBigIntOrNull(json.favicon_object_id);
        }

        if (json?.og_image_object_id !== undefined) {
            updates.og_image_object_id = parseBigIntOrNull(json.og_image_object_id);
        }

        const data = await prisma.institutions.update({
            where: { id },
            data: updates as never,
            include: {
                logo_object: { select: { bucket: true, object_key: true } },
                favicon_object: { select: { bucket: true, object_key: true } },
                og_image_object: { select: { bucket: true, object_key: true } },
            },
        });

        if (current.logo_object_id && current.logo_object_id !== data.logo_object_id) {
            await cleanupStorageObjectIfUnused(current.logo_object_id);
        }
        if (current.favicon_object_id && current.favicon_object_id !== data.favicon_object_id) {
            await cleanupStorageObjectIfUnused(current.favicon_object_id);
        }
        if (current.og_image_object_id && current.og_image_object_id !== data.og_image_object_id) {
            await cleanupStorageObjectIfUnused(current.og_image_object_id);
        }

        return NextResponse.json({ success: true, data: mapInstitutionWithStorageUrls(data) });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAdminSession(request, { superadmin: true });
    if (!auth.ok) return auth.response as NextResponse;

    const { id } = await params;
    try {
        const current = await prisma.institutions.findUnique({
            where: { id },
            select: {
                logo_object_id: true,
                favicon_object_id: true,
                og_image_object_id: true,
            },
        });

        await prisma.institutions.delete({ where: { id } });

        if (current?.logo_object_id) await cleanupStorageObjectIfUnused(current.logo_object_id);
        if (current?.favicon_object_id) await cleanupStorageObjectIfUnused(current.favicon_object_id);
        if (current?.og_image_object_id) await cleanupStorageObjectIfUnused(current.og_image_object_id);
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

