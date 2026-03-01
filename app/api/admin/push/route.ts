import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/auth';
import { broadcastPushNotification, isWebPushConfigured } from '@/lib/webPush';

type PushBroadcastPayload = {
    title?: string;
    body?: string;
    url?: string | null;
};

export async function GET(request: NextRequest) {
    const auth = await requireAdminSession(request);
    if (!auth.ok) return auth.response as NextResponse;
    const prismaWithPush = prisma as typeof prisma & {
        push_subscriptions?: {
            count: (args?: { where?: { is_active?: boolean } }) => Promise<number>;
            findMany: (args: {
                orderBy: { created_at: 'desc' };
                take: number;
                select: {
                    id: true;
                    title: true;
                    body: true;
                    target_url: true;
                    success_count: true;
                    failure_count: true;
                    sent_at: true;
                    created_at: true;
                };
            }) => Promise<
                Array<{
                    id: bigint;
                    title: string;
                    body: string;
                    target_url: string | null;
                    success_count: number;
                    failure_count: number;
                    sent_at: Date | null;
                    created_at: Date;
                }>
            >;
        };
        push_notifications?: {
            findMany: (args: {
                orderBy: { created_at: 'desc' };
                take: number;
                select: {
                    id: true;
                    title: true;
                    body: true;
                    target_url: true;
                    success_count: true;
                    failure_count: true;
                    sent_at: true;
                    created_at: true;
                };
            }) => Promise<
                Array<{
                    id: bigint;
                    title: string;
                    body: string;
                    target_url: string | null;
                    success_count: number;
                    failure_count: number;
                    sent_at: Date | null;
                    created_at: Date;
                }>
            >;
        };
    };

    try {
        if (!prismaWithPush.push_subscriptions || !prismaWithPush.push_notifications) {
            return NextResponse.json({
                success: true,
                data: {
                    configured: false,
                    totalSubscriptions: 0,
                    activeSubscriptions: 0,
                    recentNotifications: [],
                },
            });
        }

        const [totalSubscriptions, activeSubscriptions, recentNotifications] = await Promise.all([
            prismaWithPush.push_subscriptions.count(),
            prismaWithPush.push_subscriptions.count({ where: { is_active: true } }),
            prismaWithPush.push_notifications.findMany({
                orderBy: { created_at: 'desc' },
                take: 10,
                select: {
                    id: true,
                    title: true,
                    body: true,
                    target_url: true,
                    success_count: true,
                    failure_count: true,
                    sent_at: true,
                    created_at: true,
                },
            }),
        ]);

        return NextResponse.json({
            success: true,
            data: {
                configured: isWebPushConfigured(),
                totalSubscriptions,
                activeSubscriptions,
                recentNotifications: recentNotifications.map((item) => ({
                    ...item,
                    id: item.id.toString(),
                })),
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const auth = await requireAdminSession(request);
    if (!auth.ok) return auth.response as NextResponse;

    try {
        const json = (await request.json()) as PushBroadcastPayload;
        const title = String(json?.title || '').trim();
        const body = String(json?.body || '').trim();
        const url = json?.url ? String(json.url).trim() : null;

        if (!title || !body) {
            return NextResponse.json(
                { success: false, error: 'Judul dan isi notifikasi wajib diisi' },
                { status: 400 }
            );
        }

        const result = await broadcastPushNotification(
            {
                title: title.slice(0, 160),
                body: body.slice(0, 600),
                url: url || '/',
            },
            auth.session.id
        );

        if (!result.sent) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Web push belum terkonfigurasi. Lengkapi VAPID environment variables.',
                    data: result,
                },
                { status: 400 }
            );
        }

        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
