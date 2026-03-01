const STATIC_CACHE_NAME = 'perpus-static-v1';
const RUNTIME_CACHE_NAME = 'perpus-runtime-v1';
const OFFLINE_URL = '/offline.html';
const PRECACHE_ASSETS = ['/', OFFLINE_URL];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames
                    .filter(
                        (cacheName) =>
                            cacheName !== STATIC_CACHE_NAME && cacheName !== RUNTIME_CACHE_NAME
                    )
                    .map((cacheName) => caches.delete(cacheName))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    const requestUrl = new URL(event.request.url);
    if (requestUrl.origin !== self.location.origin) return;

    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => caches.match(OFFLINE_URL))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;

            return fetch(event.request)
                .then((networkResponse) => {
                    const responseClone = networkResponse.clone();
                    caches.open(RUNTIME_CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                    return networkResponse;
                })
                .catch(async () => {
                    const offlinePage = await caches.match(OFFLINE_URL);
                    return (
                        offlinePage ||
                        new Response('Offline', {
                            status: 503,
                            statusText: 'Offline',
                        })
                    );
                });
        })
    );
});

self.addEventListener('push', (event) => {
    let payload = {
        title: 'Perpustakaan Digital',
        body: 'Ada pembaruan baru.',
        url: '/',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'perpus-update',
    };

    if (event.data) {
        try {
            const parsed = event.data.json();
            payload = { ...payload, ...parsed };
        } catch (error) {
            console.error('Failed to parse push payload', error);
        }
    }

    event.waitUntil(
        self.registration.showNotification(payload.title, {
            body: payload.body,
            icon: payload.icon,
            badge: payload.badge,
            tag: payload.tag,
            data: { url: payload.url || '/' },
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification?.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (const client of windowClients) {
                if (client.url.includes(targetUrl) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
            return undefined;
        })
    );
});
