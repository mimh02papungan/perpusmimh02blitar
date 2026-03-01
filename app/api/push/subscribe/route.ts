import { NextRequest, NextResponse } from 'next/server';
import { upsertPushSubscription } from '@/lib/webPush';

type PushSubscriptionInput = {
    endpoint?: string;
    keys?: {
        p256dh?: string;
        auth?: string;
    };
};

export async function POST(request: NextRequest) {
    try {
        const json = (await request.json()) as PushSubscriptionInput;
        const endpoint = json?.endpoint?.trim() || '';
        const p256dh = json?.keys?.p256dh?.trim() || '';
        const auth = json?.keys?.auth?.trim() || '';

        if (!endpoint || !p256dh || !auth) {
            return NextResponse.json(
                { success: false, error: 'Payload subscription tidak valid' },
                { status: 400 }
            );
        }

        await upsertPushSubscription({
            endpoint,
            p256dh,
            auth,
            userAgent: request.headers.get('user-agent'),
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
