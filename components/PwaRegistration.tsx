'use client';

import { useEffect } from 'react';

export default function PwaRegistration() {
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;

        // Avoid Turbopack/dev hydration mismatches caused by an old SW caching `/_next/*` assets.
        // You can opt-in SW on dev by setting NEXT_PUBLIC_ENABLE_PWA_DEV=true.
        const isProd = process.env.NODE_ENV === 'production';
        const enableDev = process.env.NEXT_PUBLIC_ENABLE_PWA_DEV === 'true';
        if (!isProd && !enableDev) {
            navigator.serviceWorker
                .getRegistrations()
                .then((registrations) => Promise.all(registrations.map((reg) => reg.unregister())))
                .catch(() => undefined);

            if ('caches' in window) {
                caches
                    .keys()
                    .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
                    .catch(() => undefined);
            }
            return;
        }

        navigator.serviceWorker
            .register('/sw.js', { scope: '/' })
            .then((registration) => registration.update())
            .catch((error) => {
                console.error('Service worker registration failed', error);
            });
    }, []);

    return null;
}
