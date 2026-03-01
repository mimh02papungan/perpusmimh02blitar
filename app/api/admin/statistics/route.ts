import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/auth';

type DailyEventRow = {
    day: Date;
    event_type: string;
    total: bigint;
};

type SourceRow = {
    source: string;
    event_type: string;
    total: bigint;
};

export async function GET(request: NextRequest) {
    const auth = await requireAdminSession(request);
    if (!auth.ok) return auth.response as NextResponse;
    const prismaWithExtended = prisma as typeof prisma & {
        media_events?: {
            count: (args: {
                where: {
                    event_type: string;
                    created_at: {
                        gte: Date;
                    };
                };
            }) => Promise<number>;
        };
        push_subscriptions?: {
            count: (args?: { where?: { is_active?: boolean } }) => Promise<number>;
        };
        push_notifications?: {
            count: (args?: { where?: { sent_at?: { not: null } } }) => Promise<number>;
        };
    };

    try {
        const analyticsReady = Boolean(prismaWithExtended.media_events?.count);
        const pushReady = Boolean(
            prismaWithExtended.push_subscriptions?.count &&
                prismaWithExtended.push_notifications?.count
        );

        const [mediaCount, categoryCount, levelCount, typeCount, mediaTotals, todayViews, todayDownloads] =
            await Promise.all([
                prisma.learning_media.count(),
                prisma.categories.count(),
                prisma.levels.count(),
                prisma.media_types.count(),
                prisma.learning_media.aggregate({
                    _sum: {
                        view_count: true,
                        download_count: true,
                    },
                }),
                analyticsReady
                    ? prismaWithExtended.media_events!.count({
                          where: {
                              event_type: 'VIEW',
                              created_at: {
                                  gte: new Date(new Date().setHours(0, 0, 0, 0)),
                              },
                          },
                      })
                    : Promise.resolve(0),
                analyticsReady
                    ? prismaWithExtended.media_events!.count({
                          where: {
                              event_type: 'DOWNLOAD',
                              created_at: {
                                  gte: new Date(new Date().setHours(0, 0, 0, 0)),
                              },
                          },
                      })
                    : Promise.resolve(0),
            ]);

        const [dailyEvents, sourceBreakdown, topViewed, topDownloaded, activeSubscriptions, sentNotifications] =
            await Promise.all([
                analyticsReady
                    ? prisma.$queryRaw<DailyEventRow[]>`
                        SELECT DATE_TRUNC('day', created_at) AS day, event_type, COUNT(*)::bigint AS total
                        FROM media_events
                        WHERE created_at >= NOW() - INTERVAL '30 days'
                        GROUP BY 1, 2
                        ORDER BY 1 ASC
                    `
                    : Promise.resolve([] as DailyEventRow[]),
                analyticsReady
                    ? prisma.$queryRaw<SourceRow[]>`
                        SELECT COALESCE(source, 'unknown') AS source, event_type, COUNT(*)::bigint AS total
                        FROM media_events
                        WHERE created_at >= NOW() - INTERVAL '30 days'
                        GROUP BY 1, 2
                        ORDER BY total DESC
                    `
                    : Promise.resolve([] as SourceRow[]),
                prisma.learning_media.findMany({
                    orderBy: {
                        view_count: 'desc',
                    },
                    take: 6,
                    select: {
                        id: true,
                        title: true,
                        view_count: true,
                        download_count: true,
                    },
                }),
                prisma.learning_media.findMany({
                    orderBy: {
                        download_count: 'desc',
                    },
                    take: 6,
                    select: {
                        id: true,
                        title: true,
                        view_count: true,
                        download_count: true,
                    },
                }),
                pushReady
                    ? prismaWithExtended.push_subscriptions!.count({ where: { is_active: true } })
                    : Promise.resolve(0),
                pushReady
                    ? prismaWithExtended.push_notifications!.count({
                          where: {
                              sent_at: {
                                  not: null,
                              },
                          },
                      })
                    : Promise.resolve(0),
            ]);

        return NextResponse.json({
            success: true,
            data: {
                totals: {
                    mediaCount,
                    categoryCount,
                    levelCount,
                    typeCount,
                    totalViews: mediaTotals._sum.view_count || 0,
                    totalDownloads: mediaTotals._sum.download_count || 0,
                    todayViews,
                    todayDownloads,
                },
                dailyEvents: dailyEvents.map((row) => ({
                    day: row.day.toISOString(),
                    eventType: row.event_type,
                    total: Number(row.total),
                })),
                sourceBreakdown: sourceBreakdown.map((row) => ({
                    source: row.source,
                    eventType: row.event_type,
                    total: Number(row.total),
                })),
                topViewed,
                topDownloaded,
                push: {
                    activeSubscriptions,
                    sentNotifications,
                },
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
