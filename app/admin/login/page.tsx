'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, User, Loader2 } from 'lucide-react';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (data.success) {
                router.replace('/admin');
                router.refresh();
            } else {
                setError(data.message || 'Login gagal');
            }
        } catch {
            setError('Terjadi kesalahan jaringan');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--app-bg)] p-4 transition-colors">
            <div className="w-full max-w-md bg-[var(--app-surface)] p-8 rounded-3xl border shadow-2xl transition-colors" style={{ borderColor: 'var(--app-border)' }}>
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-tr from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-900/40">
                        <Lock className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-[var(--app-text)] mb-2">Admin Portal</h1>
                    <p className="text-gray-400 text-sm">Masuk untuk mengelola sistem</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Username</label>
                        <div className="relative">
                            <User className="absolute left-4 top-3.5 text-gray-500 w-5 h-5" />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-[var(--app-soft)] border rounded-xl px-12 py-3 text-[var(--app-text)] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder-gray-600"
                                style={{ borderColor: 'var(--app-border)' }}
                                placeholder="Masukkan username"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-3.5 text-gray-500 w-5 h-5" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[var(--app-soft)] border rounded-xl px-12 py-3 text-[var(--app-text)] focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder-gray-600"
                                style={{ borderColor: 'var(--app-border)' }}
                                placeholder="Masukkan password"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3.5 rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin w-5 h-5" />
                                <span>Memproses...</span>
                            </>
                        ) : (
                            'Masuk Dashboard'
                        )}
                    </button>
                </form>
            </div>

            <div className="absolute top-6 left-6">
                <Link href="/" className="flex items-center gap-2 text-[var(--app-muted)] hover:text-[var(--app-text)] transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>Kembali ke Beranda</span>
                </Link>
            </div>
        </div>
    );
}
