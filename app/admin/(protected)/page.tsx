import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getAdminSessionFromCookies } from '@/lib/auth';
import { getTotalStorageUsageBytes, STORAGE_LIMIT_BYTES } from '@/lib/storageObjects';
import { Users, BookOpen, Download, Eye, HardDrive } from 'lucide-react';

export const revalidate = 0;

function formatGb(bytes: number) {
    return `${(bytes / (1024 ** 3)).toFixed(2)} GB`;
}

export default async function AdminDashboard() {
    const session = await getAdminSessionFromCookies();
    const prismaWithAnalytics = prisma as typeof prisma & {
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
    };

    const [mediaCount, categoryCount, mediaStats, usedStorageBytes] = await Promise.all([
        prisma.learning_media.count(),
        prisma.categories.count(),
        prisma.learning_media.findMany({
            select: {
                download_count: true,
                view_count: true,
            },
        }),
        getTotalStorageUsageBytes(),
    ]);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    let todayViews = 0;
    let todayDownloads = 0;
    if (prismaWithAnalytics.media_events?.count) {
        [todayViews, todayDownloads] = await Promise.all([
            prismaWithAnalytics.media_events.count({
                where: {
                    event_type: 'VIEW',
                    created_at: {
                        gte: startOfToday,
                    },
                },
            }),
            prismaWithAnalytics.media_events.count({
                where: {
                    event_type: 'DOWNLOAD',
                    created_at: {
                        gte: startOfToday,
                    },
                },
            }),
        ]);
    }

    const totalDownloads = mediaStats.reduce((acc, curr) => acc + (curr.download_count || 0), 0);
    const totalViews = mediaStats.reduce((acc, curr) => acc + (curr.view_count || 0), 0);
    const storageUsagePercent = Number(((usedStorageBytes / STORAGE_LIMIT_BYTES) * 100).toFixed(2));

    const stats = [
        {
            label: 'Total Media',
            value: mediaCount,
            icon: <BookOpen className="text-cyan-400" />,
            iconBg: 'bg-cyan-500/10',
        },
        {
            label: 'Total Kategori',
            value: categoryCount,
            icon: <Users className="text-emerald-400" />,
            iconBg: 'bg-emerald-500/10',
        },
        {
            label: 'Total Views',
            value: totalViews,
            icon: <Eye className="text-amber-400" />,
            iconBg: 'bg-amber-500/10',
        },
        {
            label: 'Total Unduhan',
            value: totalDownloads,
            icon: <Download className="text-rose-400" />,
            iconBg: 'bg-rose-500/10',
        },
        {
            label: 'Views Hari Ini',
            value: todayViews,
            icon: <Eye className="text-sky-400" />,
            iconBg: 'bg-sky-500/10',
        },
        {
            label: 'Unduhan Hari Ini',
            value: todayDownloads,
            icon: <Download className="text-fuchsia-400" />,
            iconBg: 'bg-fuchsia-500/10',
        },
    ];

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Dashboard Overview</h1>
                <p className="text-gray-400">
                    Selamat datang kembali{session?.name ? `, ${session.name}` : ''}.
                </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6 mb-8">
                {stats.map((stat) => (
                    <div
                        key={stat.label}
                        className="bg-[#1a1a1a] border border-white/5 p-4 sm:p-6 rounded-2xl hover:border-white/10 transition-all"
                    >
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <div className={`p-2.5 sm:p-3 rounded-xl ${stat.iconBg}`}>{stat.icon}</div>
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold mb-0.5 sm:mb-1">
                            {stat.value.toLocaleString()}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500">{stat.label}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                            <h2 className="text-xl font-bold">Statistik Lanjutan</h2>
                            <p className="text-sm text-gray-500">Lihat tren event, ranking media, dan data push notification.</p>
                        </div>
                        <Link
                            href="/admin/statistics"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm"
                        >
                            Buka Halaman Statistik
                        </Link>
                    </div>
                </div>

                <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 rounded-xl bg-blue-500/10">
                            <HardDrive className="text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">Penggunaan Penyimpanan</h2>
                            <p className="text-sm text-gray-500">Batas sistem: 6.5 GB</p>
                        </div>
                    </div>

                    <div className="mb-4">
                        <div className="flex justify-between text-sm text-gray-400 mb-2">
                            <span>{formatGb(usedStorageBytes)} terpakai</span>
                            <span>{storageUsagePercent}%</span>
                        </div>
                        <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${storageUsagePercent >= 90 ? 'bg-red-500' : 'bg-blue-500'}`}
                                style={{ width: `${Math.min(storageUsagePercent, 100)}%` }}
                            />
                        </div>
                    </div>

                    {session?.role === 'SUPERADMIN' ? (
                        <Link
                            href="/admin/storage"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm"
                        >
                            Lihat Statistik Penyimpanan
                        </Link>
                    ) : (
                        <p className="text-sm text-gray-500">
                            Statistik detail penyimpanan hanya tersedia untuk superadmin.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
