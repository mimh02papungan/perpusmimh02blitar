'use client';

import { useEffect, useMemo, useState } from 'react';
import { Database, HardDrive, PieChart, FolderOpen } from 'lucide-react';

type StorageSummary = {
    limit_bytes: number;
    used_bytes: number;
    remaining_bytes: number;
    usage_percent: number;
    used_gb: number;
    limit_gb: number;
    object_count: number;
    media_count: number;
    top_media_by_size: Array<{ id: number; title: string; total_bytes: number }>;
    folder_usage: Array<{ folder: string; total_bytes: number }>;
    newest_objects: Array<{
        id: string;
        object_key: string;
        size_bytes: number;
        mime_type: string | null;
        created_at: string;
    }>;
};

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 ** 3) return `${(bytes / (1024 ** 2)).toFixed(2)} MB`;
    return `${(bytes / (1024 ** 3)).toFixed(2)} GB`;
}

export default function StoragePage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState<StorageSummary | null>(null);

    useEffect(() => {
        async function load() {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch('/api/admin/storage');
                const json = await res.json();
                if (!res.ok || !json.success) {
                    throw new Error(json.error || 'Gagal mengambil statistik penyimpanan');
                }
                setSummary(json.data);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
            } finally {
                setLoading(false);
            }
        }

        load();
    }, []);

    const usageColor = useMemo(() => {
        if (!summary) return 'bg-blue-500';
        if (summary.usage_percent >= 90) return 'bg-red-500';
        if (summary.usage_percent >= 75) return 'bg-amber-500';
        return 'bg-blue-500';
    }, [summary]);

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Statistik Penyimpanan</h1>
                <p className="text-gray-400">
                    Pantau penggunaan storage media pembelajaran dan aset web.
                </p>
            </div>

            {loading ? (
                <div className="text-center py-16 text-gray-500">Memuat data penyimpanan...</div>
            ) : error ? (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300">
                    {error}
                </div>
            ) : summary ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-3">
                                <HardDrive className="text-blue-400" />
                                <span className="text-gray-400 text-sm">Penyimpanan Terpakai</span>
                            </div>
                            <div className="text-3xl font-bold">{summary.used_gb} GB</div>
                        </div>

                        <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-3">
                                <Database className="text-emerald-400" />
                                <span className="text-gray-400 text-sm">Total Objek</span>
                            </div>
                            <div className="text-3xl font-bold">{summary.object_count.toLocaleString()}</div>
                        </div>

                        <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6">
                            <div className="flex items-center gap-3 mb-3">
                                <PieChart className="text-amber-400" />
                                <span className="text-gray-400 text-sm">Penggunaan</span>
                            </div>
                            <div className="text-3xl font-bold">{summary.usage_percent}%</div>
                        </div>
                    </div>

                    <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6 mb-8">
                        <div className="flex justify-between text-sm text-gray-400 mb-2">
                            <span>{formatBytes(summary.used_bytes)} / {formatBytes(summary.limit_bytes)}</span>
                            <span>{summary.usage_percent}%</span>
                        </div>
                        <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${usageColor}`}
                                style={{ width: `${Math.min(summary.usage_percent, 100)}%` }}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6">
                            <h2 className="text-xl font-bold mb-4">Media Paling Menguras Storage</h2>
                            <div className="space-y-3">
                                {summary.top_media_by_size.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                                    >
                                        <p className="text-sm font-medium line-clamp-1">{item.title}</p>
                                        <span className="text-xs text-gray-400">
                                            {formatBytes(item.total_bytes)}
                                        </span>
                                    </div>
                                ))}
                                {summary.top_media_by_size.length === 0 && (
                                    <p className="text-sm text-gray-500">Belum ada data media.</p>
                                )}
                            </div>
                        </div>

                        <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-6">
                            <h2 className="text-xl font-bold mb-4">Penggunaan per Folder</h2>
                            <div className="space-y-3">
                                {summary.folder_usage.map((item) => (
                                    <div key={item.folder} className="p-3 rounded-lg bg-white/5">
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm flex items-center gap-2">
                                                <FolderOpen size={14} /> {item.folder}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                {formatBytes(item.total_bytes)}
                                            </span>
                                        </div>
                                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                            <div
                                                className="h-full bg-indigo-500"
                                                style={{
                                                    width: `${Math.min(
                                                        (item.total_bytes / summary.used_bytes) * 100 || 0,
                                                        100
                                                    )}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                                {summary.folder_usage.length === 0 && (
                                    <p className="text-sm text-gray-500">Belum ada objek penyimpanan.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            ) : null}
        </div>
    );
}

