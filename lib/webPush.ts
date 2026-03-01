import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

type BroadcastPayload = {
    title: string;
    body: string;
    url?: string | null;
    tag?: string | null;
    icon?: string | null;
    badge?: string | null;
};

type PushSubscriptionRow = {
    endpoint: string;
    p256dh: string;
    auth: string;
};

let vapidConfigured = false;

function ensureVapidConfig() {
    if (vapidConfigured) return true;

    const subject = process.env.WEB_PUSH_VAPID_SUBJECT;
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;

    if (!subject || !publicKey || !privateKey) return false;

    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
    return true;
}

export function isWebPushConfigured() {
    return ensureVapidConfig();
}

export function getVapidPublicKey() {
    return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
}

function toWebPushSubscription(row: PushSubscriptionRow) {
    return {
        endpoint: row.endpoint,
        keys: {
            p256dh: row.p256dh,
            auth: row.auth,
        },
    };
}

export async function upsertPushSubscription(params: {
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string | null;
}) {
    const endpoint = params.endpoint.trim();
    if (!endpoint) {
        throw new Error('Subscription endpoint wajib diisi');
    }

    return prisma.push_subscriptions.upsert({
        where: { endpoint },
        update: {
            p256dh: params.p256dh,
            auth: params.auth,
            user_agent: params.userAgent || null,
            is_active: true,
            updated_at: new Date(),
        },
        create: {
            endpoint,
            p256dh: params.p256dh,
            auth: params.auth,
            user_agent: params.userAgent || null,
            is_active: true,
        },
    });
}

export async function deactivatePushSubscription(endpoint: string) {
    const clean = endpoint.trim();
    if (!clean) return;

    await prisma.push_subscriptions.updateMany({
        where: { endpoint: clean },
        data: {
            is_active: false,
            updated_at: new Date(),
        },
    });
}

export async function broadcastPushNotification(
    payload: BroadcastPayload,
    createdByAdminId?: string | null
) {
    if (!ensureVapidConfig()) {
        return {
            sent: false,
            reason: 'WEB_PUSH_NOT_CONFIGURED',
            successCount: 0,
            failureCount: 0,
            subscriptionCount: 0,
        };
    }

    const subscriptions = await prisma.push_subscriptions.findMany({
        where: { is_active: true },
        select: {
            endpoint: true,
            p256dh: true,
            auth: true,
        },
    });

    const notificationPayload = {
        title: payload.title.trim(),
        body: payload.body.trim(),
        url: payload.url || '/',
        tag: payload.tag || null,
        icon: payload.icon || '/favicon.ico',
        badge: payload.badge || '/favicon.ico',
    };

    const log = await prisma.push_notifications.create({
        data: {
            title: notificationPayload.title,
            body: notificationPayload.body,
            target_url: notificationPayload.url,
            payload: notificationPayload,
            created_by_admin_id: createdByAdminId || null,
            sent_at: new Date(),
        },
    });

    if (subscriptions.length === 0) {
        await prisma.push_notifications.update({
            where: { id: log.id },
            data: { success_count: 0, failure_count: 0, sent_at: new Date() },
        });
        return {
            sent: true,
            successCount: 0,
            failureCount: 0,
            subscriptionCount: 0,
            logId: log.id.toString(),
        };
    }

    let successCount = 0;
    let failureCount = 0;
    const inactiveEndpoints: string[] = [];

    await Promise.all(
        subscriptions.map(async (row) => {
            try {
                await webpush.sendNotification(
                    toWebPushSubscription(row),
                    JSON.stringify(notificationPayload)
                );
                successCount += 1;
            } catch (error) {
                failureCount += 1;
                const statusCode = (error as { statusCode?: number })?.statusCode;
                if (statusCode === 404 || statusCode === 410) {
                    inactiveEndpoints.push(row.endpoint);
                }
                console.error('Failed to send push notification', error);
            }
        })
    );

    if (inactiveEndpoints.length > 0) {
        await prisma.push_subscriptions.updateMany({
            where: { endpoint: { in: inactiveEndpoints } },
            data: {
                is_active: false,
                updated_at: new Date(),
            },
        });
    }

    await prisma.push_notifications.update({
        where: { id: log.id },
        data: {
            success_count: successCount,
            failure_count: failureCount,
            sent_at: new Date(),
        },
    });

    return {
        sent: true,
        successCount,
        failureCount,
        subscriptionCount: subscriptions.length,
        logId: log.id.toString(),
    };
}

export async function notifyNewPublicMedia(params: {
    id: number;
    title: string;
    mediaTypeName?: string | null;
}) {
    const typeName = params.mediaTypeName?.trim() || 'Media pembelajaran';
    return broadcastPushNotification({
        title: 'Media baru tersedia',
        body: `${typeName}: ${params.title}`,
        url: `/detail/${params.id}`,
        tag: `media-${params.id}`,
    });
}

export async function notifyPinnedMedia(params: {
    id: number;
    title: string;
}) {
    return broadcastPushNotification({
        title: 'Media dipin di beranda',
        body: params.title,
        url: `/detail/${params.id}`,
        tag: `pinned-${params.id}`,
    });
}
