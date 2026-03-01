'use client';

import { useEffect } from 'react';

export default function PwaRegistration() {
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;

        navigator.serviceWorker
            .register('/sw.js', { scope: '/' })
            .then((registration) => registration.update())
            .catch((error) => {
                console.error('Service worker registration failed', error);
            });
    }, []);

    return null;
}
