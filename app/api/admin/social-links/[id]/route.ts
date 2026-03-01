import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/auth';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAdminSession(request);
    if (!auth.ok) return auth.response as NextResponse;

    const { id } = await params;
    try {
        const json = await request.json();
        const name = String(json?.name || '').trim();
        const link = String(json?.link || '').trim();
        const icon = String(json?.icon || '').trim();

        if (!name || !link || !icon) {
            return NextResponse.json(
                { success: false, error: 'Name, Link, dan Icon wajib diisi' },
                { status: 400 }
            );
        }

        const data = await prisma.social_links.update({
            where: { id },
            data: {
                name,
                link,
                icon,
                updated_at: new Date(),
            },
        });

        return NextResponse.json({ success: true, data });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAdminSession(request);
    if (!auth.ok) return auth.response as NextResponse;

    const { id } = await params;
    try {
        await prisma.social_links.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}


