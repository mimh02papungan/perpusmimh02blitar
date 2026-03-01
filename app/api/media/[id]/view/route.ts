import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logMediaEvent } from '@/lib/analytics';

export async function POST(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const id = Number(params.id);
        const source = new URL(request.url).searchParams.get('source');

        const updated = await prisma.learning_media.update({
            where: { id },
            data: {
                view_count: {
                    increment: 1,
                },
            },
            select: {
                view_count: true,
            },
        });
        await logMediaEvent({
            request,
            mediaId: id,
            eventType: 'VIEW',
            source,
        });

        return NextResponse.json({ success: true, count: updated.view_count || 0 });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
