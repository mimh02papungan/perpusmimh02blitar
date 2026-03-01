import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

type MediaEventType = 'VIEW' | 'DOWNLOAD';

function resolveClientIp(request: NextRequest): string | null {
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        const candidate = forwardedFor.split(',')[0]?.trim();
        if (candidate) return candidate;
    }

    const realIp = request.headers.get('x-real-ip')?.trim();
    if (realIp) return realIp;

    return null;
}

function hashValue(value: string): string {
    const salt = process.env.ANALYTICS_HASH_SALT || 'perpus-analytics-salt';
    return createHash('sha256').update(`${salt}:${value}`).digest('hex');
}

export async function logMediaEvent(params: {
    request: NextRequest;
    mediaId: number;
    eventType: MediaEventType;
    source?: string | null;
}) {
    const ip = resolveClientIp(params.request);
    const userAgent = params.request.headers.get('user-agent');

    try {
        await prisma.media_events.create({
            data: {
                media_id: params.mediaId,
                event_type: params.eventType,
                source: params.source ? params.source.trim().slice(0, 30) : null,
                ip_hash: ip ? hashValue(ip) : null,
                user_agent: userAgent || null,
            },
        });
    } catch (error) {
        console.error('Failed to log media event', error);
    }
}
