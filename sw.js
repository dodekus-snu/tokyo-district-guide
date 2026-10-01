const VERSION = 'tokyo-guide-v21-pwa-1';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './assets/icon-180.png','./assets/icon-192.png','./assets/icon-512.png',
  './offline.html'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Navigations: network first, cached guide/offline fallback.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then(res => {
      const copy=res.clone(); caches.open(VERSION).then(c=>c.put('./index.html',copy)); return res;
    }).catch(async () => (await caches.match('./index.html')) || caches.match('./offline.html')));
    return;
  }
  // Images/fonts/styles: cache first, then network and cache successful/opaque responses.
  if (req.destination === 'image' || req.destination === 'font' || req.destination === 'style') {
    event.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) caches.open(VERSION).then(c => c.put(req, res.clone()));
      return res;
    })));
    return;
  }
  // Same-origin app assets: stale-while-revalidate.
  if (url.origin === self.location.origin) {
    event.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(res => { if(res.ok) caches.open(VERSION).then(c=>c.put(req,res.clone())); return res; });
      return hit || net;
    }));
  }
});
