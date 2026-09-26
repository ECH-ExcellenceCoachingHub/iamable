/* Am Able service worker: makes the app installable and usable on a poor connection. */
const VERSION = 'v1';
const PAGE_CACHE = `pages-${VERSION}`;
const STATIC_CACHE = `static-${VERSION}`;
const SIGN_CACHE = `signs-${VERSION}`;
const OFFLINE_URL = '/offline.html';
const PRECACHE = [OFFLINE_URL, '/icons/icon-192.png', '/icons/icon-512.png'];
const SIGN_HOST = 'www.lifeprint.com';
const MAX_SIGNS = 300;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

/** Pages: network first so content is always fresh; cached copy or the offline page as fallback. */
async function handleNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) (await caches.open(PAGE_CACHE)).put(request, response.clone());
    return response;
  } catch {
    return (await caches.match(request)) || (await caches.match(OFFLINE_URL));
  }
}

/** Hashed build assets and sign media never change, so serve them from cache first. */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  // Sign media is cross-origin, so responses may be opaque (status 0); they still display fine.
  if (response.ok || response.type === 'opaque') {
    (await caches.open(cacheName)).put(request, response.clone());
    if (cacheName === SIGN_CACHE) trim(SIGN_CACHE, MAX_SIGNS);
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  // Range requests come from <video>; let the browser handle those directly.
  if (request.method !== 'GET' || request.headers.has('range')) return;
  const url = new URL(request.url);

  if (url.hostname === SIGN_HOST) {
    event.respondWith(cacheFirst(request, SIGN_CACHE));
    return;
  }
  // Leave API calls and other origins alone.
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
  } else if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  }
});

/* ---------- Push notifications ---------- */

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Am Able';
  const url = data.url || '/dashboard/notifications';

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, {
        body: data.body || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: data.tag,
        renotify: Boolean(data.tag),
        requireInteraction: data.type === 'error' || data.type === 'warning',
        data: { url },
      });
      if (typeof data.badgeCount === 'number' && 'setAppBadge' in self.navigator) {
        self.navigator.setAppBadge(data.badgeCount).catch(() => {});
      }
      // Let open tabs refresh their bell count and list without a reload.
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      windows.forEach((client) => client.postMessage({ type: 'notification:received', payload: data }));
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/dashboard/notifications', self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const sameOrigin = windows.filter((c) => new URL(c.url).origin === self.location.origin);
      const exact = sameOrigin.find((c) => c.url === target);
      if (exact) return exact.focus();
      if (sameOrigin[0]) {
        const client = await sameOrigin[0].focus();
        return client.navigate ? client.navigate(target) : undefined;
      }
      return self.clients.openWindow(target);
    })()
  );
});

// The browser rotated the subscription; ask an open tab to re-register it with the server.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windows) => windows.forEach((client) => client.postMessage({ type: 'push:resubscribe' })))
  );
});
