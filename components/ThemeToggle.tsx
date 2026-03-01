'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const THEME_STORAGE_KEY = 'theme-preference';
type ThemeMode = 'dark' | 'light';

function getSystemTheme(): ThemeMode {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function resolveThemeFromDom(): ThemeMode {
    if (typeof document === 'undefined') return 'dark';
    return document.documentElement.classList.contains('light') ? 'light' : 'dark';
}

function applyTheme(nextTheme: ThemeMode) {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.remove('dark', 'light');
    root.classList.add(nextTheme);
    root.style.colorScheme = nextTheme;
    try {
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
        // Ignore storage errors (private mode, restricted environments).
    }
    window.dispatchEvent(new CustomEvent('themechange', { detail: nextTheme }));
}

export default function ThemeToggle({
    className = '',
    showLabel = false,
}: {
    className?: string;
    showLabel?: boolean;
}) {
    const [theme, setTheme] = useState<ThemeMode>('dark');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const current = resolveThemeFromDom();
        setTheme(current);
        setMounted(true);

        const onThemeChange = (event: Event) => {
            const customEvent = event as CustomEvent<ThemeMode>;
            const nextTheme = customEvent.detail || resolveThemeFromDom();
            setTheme(nextTheme);
        };
        window.addEventListener('themechange', onThemeChange);
        return () => {
            window.removeEventListener('themechange', onThemeChange);
        };
    }, []);

    const toggleTheme = () => {
        const current = mounted ? theme : resolveThemeFromDom();
        const nextTheme: ThemeMode = current === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
        applyTheme(nextTheme);
    };

    const label = theme === 'dark' ? 'Dark' : 'Light';

    return (
        <button
            type="button"
            onClick={toggleTheme}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors theme-toggle-btn ${className}`}
            aria-label={`Ganti tema ke ${theme === 'dark' ? 'light' : 'dark'}`}
            title={`Tema saat ini: ${label}`}
        >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            {showLabel && <span className="text-xs font-medium">Tema: {label}</span>}
        </button>
    );
}
