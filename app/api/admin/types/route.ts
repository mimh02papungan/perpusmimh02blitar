import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
    const auth = await requireAdminSession(request);
    if (!auth.ok) return auth.response as NextResponse;

    try {
        const data = await prisma.media_types.findMany({
            orderBy: { name: 'asc' },
        });
        return NextResponse.json({ success: true, data });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const auth = await requireAdminSession(request);
    if (!auth.ok) return auth.response as NextResponse;

    try {
        const json = await request.json();
        const name = String(json?.name || '').trim();
        const icon = String(json?.icon || '').trim() || null;

        if (!name) {
            return NextResponse.json(
                { success: false, error: 'Nama tipe media wajib diisi' },
                { status: 400 }
            );
        }

        const data = await prisma.media_types.create({
            data: {
                name,
                icon,
            },
        });

        return NextResponse.json({ success: true, data });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}


