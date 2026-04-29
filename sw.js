const CACHE_NAME = 'sklad-v2';
const ASSETS = [
  'index.html',
  'app.js',
  'manifest.json',
  'https://unpkg.com'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then((res) => res || fetch(e.request)));
});
