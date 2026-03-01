'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, BellRing, CheckCircle, Send } from 'lucide-react';

interface PushSummary {
    configured: boolean;
    totalSubscriptions: number;
    activeSubscriptions: number;
    recentNotifications: Array<{
        id: string;
        title: string;
        body: string;
        target_url: string | null;
        success_count: number;
        failure_count: number;
        sent_at: string | null;
        created_at: string;
    }>;
}

export default function PushPage() {
    const [summary, setSummary] = useState<PushSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [form, setForm] = useState({
        title: '',
        body: '',
        url: '/',
    });

    const showError = (text: string) => setMessage({ type: 'error', text });
    const showSuccess = (text: string) => setMessage({ type: 'success', text });

    const fetchSummary = async () => {
        const res = await fetch('/api/admin/push');
        const json = await res.json();
        if (!res.ok || !json.success) {
            throw new Error(json.error || 'Gagal memuat ringkasan push notification');
        }
        setSummary(json.data as PushSummary);
    };

    useEffect(() => {
        setMessage(null);
        fetchSummary()
            .catch((error) => showError(error instanceof Error ? error.message : 'Gagal memuat data'))
            .finally(() => setInitialLoading(false));
    }, []);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const res = await fetch('/api/admin/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Gagal mengirim push notification');
            }

            showSuccess(`Push terkirim: ${json.data.successCount} sukses, ${json.data.failureCount} gagal`);
            setForm((current) => ({ ...current, body: '' }));
            await fetchSummary();
        } catch (error: unknown) {
            showError(error instanceof Error ? error.message : 'Gagal mengirim push notification');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Web Push Notification</h1>
                <p className="text-gray-400">Kelola broadcast notifikasi ke pengguna aplikasi.</p>
            </div>

            {message && (
                <div
                    className={`p-4 rounded-xl flex items-start gap-3 ${
                        message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                    }`}
                >
                    {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    <p>{message.text}</p>
                </div>
            )}

            <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                        <BellRing size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">Status Web Push</h3>
                        <p className="text-sm text-gray-400">Pastikan VAPID key sudah terpasang di environment.</p>
                    </div>
                </div>

                {initialLoading ? (
                    <p className="text-gray-400">Memuat ringkasan push...</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                            <p className="text-sm text-gray-400 mb-1">Konfigurasi</p>
                            <p className={`font-semibold ${summary?.configured ? 'text-green-400' : 'text-red-400'}`}>
                                {summary?.configured ? 'Aktif' : 'Belum aktif'}
                            </p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                            <p className="text-sm text-gray-400 mb-1">Subscriber Aktif</p>
                            <p className="font-semibold">{summary?.activeSubscriptions || 0}</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                            <p className="text-sm text-gray-400 mb-1">Total Subscriber</p>
                            <p className="font-semibold">{summary?.totalSubscriptions || 0}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4">Kirim Broadcast Notification</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Judul Notifikasi</label>
                        <input
                            type="text"
                            required
                            value={form.title}
                            onChange={(event) => setForm({ ...form, title: event.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-purple-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Isi Notifikasi</label>
                        <textarea
                            rows={3}
                            required
                            value={form.body}
                            onChange={(event) => setForm({ ...form, body: event.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-purple-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">URL Target</label>
                        <input
                            type="text"
                            value={form.url}
                            onChange={(event) => setForm({ ...form, url: event.target.value })}
                            placeholder="/detail/123 atau /"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-purple-500 outline-none"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-medium disabled:opacity-50"
                    >
                        <Send size={16} />
                        <span>{loading ? 'Mengirim...' : 'Kirim Notifikasi'}</span>
                    </button>
                </form>
            </div>

            <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4">Riwayat Broadcast Terbaru</h3>
                {!summary?.recentNotifications?.length ? (
                    <p className="text-sm text-gray-400">Belum ada riwayat push notification.</p>
                ) : (
                    <div className="space-y-3">
                        {summary.recentNotifications.map((item) => (
                            <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold">{item.title}</p>
                                        <p className="text-sm text-gray-400 mt-1">{item.body}</p>
                                        <p className="text-xs text-gray-500 mt-2">
                                            {item.target_url || '/'} | {new Date(item.created_at).toLocaleString('id-ID')}
                                        </p>
                                    </div>
                                    <div className="text-right text-xs">
                                        <p className="text-green-400">Sukses: {item.success_count}</p>
                                        <p className="text-red-400">Gagal: {item.failure_count}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
