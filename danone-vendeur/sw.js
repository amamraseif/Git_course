const CACHE = 'fennec-v2-3';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './focus.js',
  './manifest.json',
  './fennec-logo.png',
  './brand/logo.png',
  './icon-maskable-512.png',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './fonts/fonts.css',
  './fonts/Amiri-400-arabic.woff2',
  './fonts/Amiri-400-latin.woff2',
  './fonts/Amiri-700-arabic.woff2',
  './fonts/Amiri-700-latin.woff2',
  './fonts/IBMPlexSansArabic-400-arabic.woff2',
  './fonts/IBMPlexSansArabic-400-latin.woff2',
  './fonts/IBMPlexSansArabic-500-arabic.woff2',
  './fonts/IBMPlexSansArabic-500-latin.woff2',
  './fonts/IBMPlexSansArabic-700-arabic.woff2',
  './fonts/IBMPlexSansArabic-700-latin.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first: testers always get the latest version; the cache keeps the app working offline.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) if ('focus' in c) return c.focus();
      return self.clients.openWindow('./index.html');
    })
  );
});
