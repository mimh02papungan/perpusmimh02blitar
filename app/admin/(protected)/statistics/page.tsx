'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, Eye, Layers, School2, Shapes, BellRing } from 'lucide-react';

type StatisticsResponse = {
    totals: {
        mediaCount: number;
        categoryCount: number;
        levelCount: number;
        typeCount: number;
        totalViews: number;
        totalDownloads: number;
        todayViews: number;
        todayDownloads: number;
    };
    dailyEvents: Array<{
        day: string;
        eventType: string;
        total: number;
    }>;
    sourceBreakdown: Array<{
        source: string;
        eventType: string;
        total: number;
    }>;
    topViewed: Array<{
        id: number;
        title: string;
        view_count: number | null;
        download_count: number | null;
    }>;
    topDownloaded: Array<{
        id: number;
        title: string;
        view_count: number | null;
        download_count: number | null;
    }>;
    push: {
        activeSubscriptions: number;
        sentNotifications: number;
    };
};

export default function StatisticsPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<StatisticsResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadStats() {
            try {
                setLoading(true);
                const res = await fetch('/api/admin/statistics');
                const json = await res.json();
                if (!res.ok || !json.success) {
                    throw new Error(json.error || 'Gagal memuat statistik');
                }
                setStats(json.data as StatisticsResponse);
            } catch (fetchError) {
                setError(fetchError instanceof Error ? fetchError.message : 'Gagal memuat statistik');
            } finally {
                setLoading(false);
            }
        }

        loadStats();
    }, []);

    const dailyChart = useMemo(() => {
        if (!stats) return [];
        const grouped = new Map<string, { day: string; view: number; download: number }>();
        for (const item of stats.dailyEvents) {
            const day = item.day.slice(0, 10);
            const existing = grouped.get(day) || { day, view: 0, download: 0 };
            if (item.eventType === 'VIEW') existing.view += item.total;
            if (item.eventType === 'DOWNLOAD') existing.download += item.total;
            grouped.set(day, existing);
        }
        return Array.from(grouped.values()).sort((a, b) => a.day.localeCompare(b.day)).slice(-14);
    }, [stats]);

    const maxDailyValue = useMemo(() => {
        return Math.max(
            1,
            ...dailyChart.map((item) => Math.max(item.view, item.download))
        );
    }, [dailyChart]);

    if (loading) {
        return <div className="text-gray-400">Memuat statistik...</div>;
    }

    if (error || !stats) {
        return <div className="text-red-400">{error || 'Data statistik tidak tersedia'}</div>;
    }

    const summaryCards = [
        {
            label: 'Total Media',
            value: stats.totals.mediaCount,
            icon: <BarChart3 className="text-cyan-400" />,
            iconBg: 'bg-cyan-500/10',
        },
        {
            label: 'Total Kategori',
            value: stats.totals.categoryCount,
            icon: <Layers className="text-emerald-400" />,
            iconBg: 'bg-emerald-500/10',
        },
        {
            label: 'Total Tingkatan',
            value: stats.totals.levelCount,
            icon: <School2 className="text-amber-400" />,
            iconBg: 'bg-amber-500/10',
        },
        {
            label: 'Total Jenis Media',
            value: stats.totals.typeCount,
            icon: <Shapes className="text-purple-400" />,
            iconBg: 'bg-purple-500/10',
        },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold mb-2">Statistik Sistem</h1>
                <p className="text-gray-400">Ringkasan performa media, engagement pengguna, dan push notification.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {summaryCards.map((card) => (
                    <div key={card.label} className="bg-[#1a1a1a] border border-white/5 p-6 rounded-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-xl ${card.iconBg}`}>{card.icon}</div>
                        </div>
                        <div className="text-3xl font-bold mb-1">{card.value.toLocaleString()}</div>
                        <div className="text-sm text-gray-500">{card.label}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <MiniStatCard label="Total Views" value={stats.totals.totalViews} icon={<Eye size={16} />} />
                <MiniStatCard label="Total Downloads" value={stats.totals.totalDownloads} icon={<Download size={16} />} />
                <MiniStatCard label="Views Hari Ini" value={stats.totals.todayViews} icon={<Eye size={16} />} />
                <MiniStatCard label="Downloads Hari Ini" value={stats.totals.todayDownloads} icon={<Download size={16} />} />
                <MiniStatCard label="Subscriber Push Aktif" value={stats.push.activeSubscriptions} icon={<BellRing size={16} />} />
                <MiniStatCard label="Total Push Terkirim" value={stats.push.sentNotifications} icon={<BellRing size={16} />} />
            </div>

            <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6">
                <h2 className="text-xl font-bold mb-4">Tren 14 Hari Terakhir</h2>
                {!dailyChart.length ? (
                    <p className="text-sm text-gray-500">Belum ada event view/download yang terekam.</p>
                ) : (
                    <div className="space-y-3">
                        {dailyChart.map((item) => (
                            <div key={item.day}>
                                <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                                    <span>{new Date(item.day).toLocaleDateString('id-ID')}</span>
                                    <span>View {item.view} • Download {item.download}</span>
                                </div>
                                <div className="h-2 rounded-full bg-white/5 overflow-hidden flex">
                                    <div
                                        className="h-full bg-blue-500"
                                        style={{ width: `${(item.view / maxDailyValue) * 100}%` }}
                                    />
                                    <div
                                        className="h-full bg-emerald-500"
                                        style={{ width: `${(item.download / maxDailyValue) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <RankingList
                    title="Media Paling Banyak Dilihat"
                    items={stats.topViewed.map((item) => ({
                        id: item.id,
                        title: item.title,
                        metric: item.view_count || 0,
                        secondary: item.download_count || 0,
                    }))}
                    metricLabel="Views"
                    secondaryLabel="Downloads"
                />
                <RankingList
                    title="Media Paling Banyak Diunduh"
                    items={stats.topDownloaded.map((item) => ({
                        id: item.id,
                        title: item.title,
                        metric: item.download_count || 0,
                        secondary: item.view_count || 0,
                    }))}
                    metricLabel="Downloads"
                    secondaryLabel="Views"
                />
            </div>

            <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6">
                <h2 className="text-xl font-bold mb-4">Sumber Event (30 Hari)</h2>
                {!stats.sourceBreakdown.length ? (
                    <p className="text-sm text-gray-500">Belum ada data source event.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {stats.sourceBreakdown.map((item, index) => (
                            <div key={`${item.source}-${item.eventType}-${index}`} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                                <p className="font-semibold">{item.source}</p>
                                <p className="text-xs text-gray-400">{item.eventType}</p>
                                <p className="text-lg font-bold mt-1">{item.total.toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function MiniStatCard({
    label,
    value,
    icon,
}: {
    label: string;
    value: number;
    icon: React.ReactNode;
}) {
    return (
        <div className="rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                {icon}
                <span>{label}</span>
            </div>
            <div className="text-xl font-bold">{value.toLocaleString()}</div>
        </div>
    );
}

function RankingList({
    title,
    items,
    metricLabel,
    secondaryLabel,
}: {
    title: string;
    items: Array<{
        id: number;
        title: string;
        metric: number;
        secondary: number;
    }>;
    metricLabel: string;
    secondaryLabel: string;
}) {
    return (
        <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4">{title}</h2>
            {!items.length ? (
                <p className="text-sm text-gray-500">Belum ada data.</p>
            ) : (
                <div className="space-y-3">
                    {items.map((item, index) => (
                        <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="text-xs text-gray-400">#{index + 1}</p>
                                    <p className="font-semibold">{item.title}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold">
                                        {item.metric.toLocaleString()} {metricLabel}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        {item.secondary.toLocaleString()} {secondaryLabel}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
