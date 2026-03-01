import { NextRequest, NextResponse } from 'next/server';
import { deactivatePushSubscription } from '@/lib/webPush';

type UnsubscribePayload = {
    endpoint?: string;
};

export async function POST(request: NextRequest) {
    try {
        const json = (await request.json()) as UnsubscribePayload;
        const endpoint = json?.endpoint?.trim() || '';

        if (!endpoint) {
            return NextResponse.json(
                { success: false, error: 'Endpoint subscription wajib diisi' },
                { status: 400 }
            );
        }

        await deactivatePushSubscription(endpoint);
        return NextResponse.json({ success: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
