'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

interface Institution {
  name: string;
  logo_url?: string;
}

export default function Header() {
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { href: '/', icon: 'home', label: 'Beranda' },
    { href: '/search', icon: 'search', label: 'Daftar Media' },
    { href: '/categories', icon: 'category', label: 'Kategori' },
    { href: '/categories/jenis-media', icon: 'media_type', label: 'Jenis Media' },
    { href: '/categories/tingkatan', icon: 'level', label: 'Tingkatan' },
    { href: '/contact', icon: 'mail', label: 'Kontak' },
  ] as const;

  useEffect(() => {
    fetch('/api/institution')
      .then((res) => res.json())
      .then(setInstitution);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileMenuOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 glass-card border-b backdrop-blur-md"
        style={{ borderColor: 'var(--app-border)', background: 'var(--app-nav-bg)' }}
      >
        <div className="container mx-auto px-4 md:px-6 py-3 md:py-4">
          <div className="flex justify-between items-center gap-3">
            <div className="flex items-center gap-2 md:gap-3 group min-w-0">
              <Link href="/admin" className="block relative z-10">
                <div className="w-10 h-10 md:w-12 md:h-12 overflow-hidden transform group-hover:scale-105 transition-transform duration-300 flex items-center justify-center">
                  {institution?.logo_url ? (
                    <Image
                      src={institution.logo_url}
                      alt="Logo"
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                      sizes="48px"
                      unoptimized={institution.logo_url.startsWith('/api/storage/object/')}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <span className="text-slate-50 text-xs">MI</span>
                    </div>
                  )}
                </div>
              </Link>

              <Link
                href="/"
                className="block min-w-0 max-w-[11rem] sm:max-w-[15rem] md:max-w-[20rem] lg:max-w-[28rem]"
                title={institution?.name || 'Perpustakaan Digital'}
              >
                <h1
                  className="text-xs sm:text-sm md:text-base lg:text-lg font-bold gradient-text truncate"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {institution?.name || 'Perpustakaan Digital'}
                </h1>
              </Link>
            </div>

            <div className="hidden md:flex items-center gap-1 md:gap-2">
              {navItems.map((item) => (
                <NavLink key={item.href} href={item.href} icon={item.icon}>
                  {item.label}
                </NavLink>
              ))}
              <ThemeToggle className="ml-1" />
            </div>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((value) => !value)}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border transition-colors"
              style={{
                borderColor: 'var(--app-border)',
                background: 'var(--app-soft)',
                color: 'var(--app-text)',
              }}
              aria-label={isMobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <button
          type="button"
          className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-label="Tutup sidebar navigasi"
        />
      )}

      <aside
        className={`md:hidden fixed top-0 left-0 z-[60] h-full w-[18rem] max-w-[85vw] border-r p-4 transition-transform duration-300 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: 'var(--app-surface)',
          borderColor: 'var(--app-border)',
        }}
        aria-hidden={!isMobileMenuOpen}
      >
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="font-semibold text-sm" onClick={() => setIsMobileMenuOpen(false)}>
            Menu
          </Link>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border"
            style={{
              borderColor: 'var(--app-border)',
              background: 'var(--app-soft)',
              color: 'var(--app-text)',
            }}
            aria-label="Tutup menu navigasi"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              mobile
              onNavigate={() => setIsMobileMenuOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <ThemeToggle className="mt-4 w-full justify-center" showLabel />
      </aside>
    </>
  );
}

function NavLink({
  href,
  icon,
  children,
  mobile = false,
  onNavigate,
}: {
  href: string;
  icon: string;
  children: React.ReactNode;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const icons = {
    home: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
    search: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />,
    category: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />,
    media_type: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />,
    level: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3L2 9l10 6 10-6-10-6zm0 8v10m-5-7l5 3 5-3" />,
    mail: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
  };

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center rounded-xl text-[var(--app-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-soft)] transition-all duration-300 ${
        mobile ? 'gap-3 px-4 py-3 text-sm' : 'gap-1 md:gap-2 px-3 md:px-4 py-2'
      }`}
    >
      <svg className="w-4 md:w-5 h-4 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {icons[icon as keyof typeof icons]}
      </svg>
      <span className={mobile ? 'inline font-medium' : 'hidden xl:inline font-medium'}>{children}</span>
    </Link>
  );
}
