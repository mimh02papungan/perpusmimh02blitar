'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    BookOpen,
    Users,
    Settings,
    LogOut,
    Menu,
    X,
    Layers,
    HardDrive,
    Shield,
    BarChart3,
    BellRing,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

type AdminRole = 'ADMIN' | 'SUPERADMIN';

interface MeData {
    id: string;
    username: string;
    name: string | null;
    role: AdminRole;
    jabatan: string | null;
    foto_url: string | null;
}

export default function Sidebar() {
    const [isOpen, setIsOpen] = useState(false);
    const [me, setMe] = useState<MeData | null>(null);
    const [role, setRole] = useState<AdminRole>('ADMIN');
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        fetch('/api/admin/me')
            .then((res) => res.json())
            .then((json) => {
                if (json.success && json.data) {
                    setMe(json.data);
                    if (json.data.role) setRole(json.data.role);
                }
            })
            .catch((err) => console.error('Failed to fetch sidebar data', err));
    }, []);

    const handleLogout = async () => {
        try {
            await fetch('/api/admin/logout', { method: 'POST' });
            router.push('/admin/login');
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    const menuItems = [
        { name: 'Dashboard', href: '/admin', icon: <LayoutDashboard size={20} /> },
        { name: 'Statistik', href: '/admin/statistics', icon: <BarChart3 size={20} /> },
        { name: 'Web Push', href: '/admin/push', icon: <BellRing size={20} /> },
        { name: 'Media Pembelajaran', href: '/admin/media', icon: <BookOpen size={20} /> },
        { name: 'Kategori', href: '/admin/categories', icon: <Layers size={20} /> },
        { name: 'Tingkatan', href: '/admin/levels', icon: <Layers size={20} /> },
        ...(role === 'SUPERADMIN'
            ? [
                  { name: 'Admin', href: '/admin/users', icon: <Users size={20} /> },
                  { name: 'Pengaturan', href: '/admin/settings', icon: <Settings size={20} /> },
                  { name: 'Penyimpanan', href: '/admin/storage', icon: <HardDrive size={20} /> },
              ]
            : []),
    ];

    const isActive = (path: string) => pathname === path;

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed top-4 left-4 z-50 p-2 bg-purple-600 rounded-lg text-white md:hidden shadow-lg"
            >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside
                className={`fixed top-0 left-0 h-full w-72 text-[var(--app-text)] border-r z-40 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
                style={{
                    background: 'var(--app-surface)',
                    borderColor: 'var(--app-border)',
                }}
            >
                <div className="flex h-full flex-col">
                    <div className="p-6 pb-4 shrink-0">
                        <Link
                            href="/admin/profile"
                            onClick={() => setIsOpen(false)}
                            className="p-4 rounded-xl border bg-[var(--app-soft)] hover:bg-[var(--app-soft-hover)] transition-all flex items-center gap-3"
                            style={{ borderColor: 'var(--app-border)' }}
                        >
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-purple-500/10 flex items-center justify-center shrink-0">
                                {me?.foto_url ? (
                                    <img
                                        src={me.foto_url}
                                        alt={me.name || me.username}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <Shield size={20} className="text-purple-300" />
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="font-semibold text-sm truncate">
                                    {me?.name || me?.username || 'Admin'}
                                </p>
                                <p className="text-xs text-[var(--app-muted)] truncate">
                                    {me?.jabatan || me?.role || 'Pengguna'}
                                </p>
                                <p className="text-[11px] text-purple-300 mt-0.5">
                                    {me?.role || 'ADMIN'}
                                </p>
                            </div>
                        </Link>
                    </div>

                    <nav className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
                        <div className="space-y-2">
                            {menuItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                                        isActive(item.href)
                                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20'
                                            : 'text-[var(--app-muted)] hover:bg-[var(--app-soft)] hover:text-[var(--app-text)]'
                                    }`}
                                >
                                    {item.icon}
                                    <span className="font-medium text-sm">{item.name}</span>
                                </Link>
                            ))}
                        </div>
                    </nav>

                    <div
                        className="shrink-0 w-full p-6 border-t"
                        style={{
                            background: 'var(--app-surface)',
                            borderColor: 'var(--app-border)',
                        }}
                    >
                        <ThemeToggle showLabel className="w-full justify-center mb-3" />
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                        >
                            <LogOut size={20} />
                            <span className="font-medium text-sm">Sign Out</span>
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
}
