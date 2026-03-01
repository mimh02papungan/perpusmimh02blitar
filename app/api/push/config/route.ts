import { NextResponse } from 'next/server';
import { getVapidPublicKey, isWebPushConfigured } from '@/lib/webPush';

export async function GET() {
    const publicKey = getVapidPublicKey();
    return NextResponse.json({
        success: true,
        enabled: isWebPushConfigured(),
        publicKey: publicKey || null,
    });
}
