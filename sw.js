// sw.js — simple offline cache for app shell + data
const CACHE = 'jbz-cache-v2025-12-11-7';
const basePath = new URL(self.registration.scope).pathname.replace(/\/$/, '');
const CORE = [
  `${basePath}/`,
  `${basePath}/index.html`,
  `${basePath}/assignments.json`,
  `${basePath}/assets/css/main.css`,
  `${basePath}/assets/js/app.js`,
  `${basePath}/assets/js/data.js`,
  `${basePath}/assets/js/storage.js`,
  `${basePath}/assets/js/ui.js`,
  `${basePath}/assets/js/admin.js`
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET') return; // only cache GET
  // Strategy: network-first for assignments.json, cache-first for others
  if (url.pathname.endsWith('/assignments.json')) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
  } else if (CORE.includes(url.pathname) || url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }))
    );
  }
});
