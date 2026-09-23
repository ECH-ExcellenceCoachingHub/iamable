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
