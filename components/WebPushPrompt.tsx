'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { usePathname } from 'next/navigation';

type PushConfigResponse = {
    success?: boolean;
    enabled?: boolean;
    publicKey?: string | null;
};

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export default function WebPushPrompt() {
    const pathname = usePathname();
    const isAdminArea = useMemo(() => pathname?.startsWith('/admin'), [pathname]);
    const [visible, setVisible] = useState(false);
    const [subscribed, setSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [vapidKey, setVapidKey] = useState<string | null>(null);

    useEffect(() => {
        if (isAdminArea) return;
        if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
            return;
        }

        async function initialize() {
            try {
                const configRes = await fetch('/api/push/config');
                const config = (await configRes.json()) as PushConfigResponse;
                if (!config.enabled || !config.publicKey) return;

                setVapidKey(config.publicKey);

                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();
                if (subscription) {
                    setSubscribed(true);
                    return;
                }

                if (Notification.permission !== 'denied') {
                    setVisible(true);
                }
            } catch (error) {
                console.error('Failed to initialize web push prompt', error);
            }
        }

        initialize();
    }, [isAdminArea]);

    const subscribe = async () => {
        if (!vapidKey) return;
        setLoading(true);
        try {
            let permission = Notification.permission;
            if (permission === 'default') {
                permission = await Notification.requestPermission();
            }

            if (permission !== 'granted') {
                setVisible(false);
                return;
            }

            const registration = await navigator.serviceWorker.ready;
            let subscription = await registration.pushManager.getSubscription();
            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidKey),
                });
            }

            const response = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subscription.toJSON()),
            });
            const json = await response.json();

            if (!response.ok || !json.success) {
                throw new Error(json.error || 'Gagal mengaktifkan notifikasi');
            }

            setSubscribed(true);
            setVisible(false);
        } catch (error) {
            console.error('Failed to subscribe push', error);
        } finally {
            setLoading(false);
        }
    };

    const unsubscribe = async () => {
        setLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (!subscription) {
                setSubscribed(false);
                return;
            }

            await fetch('/api/push/unsubscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ endpoint: subscription.endpoint }),
            });

            await subscription.unsubscribe();
            setSubscribed(false);
            setVisible(true);
        } catch (error) {
            console.error('Failed to unsubscribe push', error);
        } finally {
            setLoading(false);
        }
    };

    if (isAdminArea || !vapidKey) return null;

    if (subscribed) {
        return (
            <button
                type="button"
                onClick={unsubscribe}
                disabled={loading}
                className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/75 px-4 py-2 text-xs text-white backdrop-blur disabled:opacity-50"
                title="Matikan notifikasi"
            >
                <BellOff size={14} />
                <span>Notifikasi aktif</span>
            </button>
        );
    }

    if (!visible) return null;

    return (
        <button
            type="button"
            onClick={subscribe}
            disabled={loading}
            className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-white/15 bg-purple-600 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-purple-900/30 disabled:opacity-50"
        >
            <Bell size={14} />
            <span>{loading ? 'Memproses...' : 'Aktifkan Notifikasi'}</span>
        </button>
    );
}
