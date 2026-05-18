// Borsa Takip Service Worker - her zaman güncel versiyon
const CACHE_NAME = 'borsa-takip-v3.0.0';

self.addEventListener('install', (event) => {
  // Yeni SW hemen aktif olsun, beklemesin
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Eski cache'leri temizle
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  // Hemen tüm sayfaları kontrol et
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // API isteklerini cache'leme
  if (request.url.includes('/api/')) return;

  // Network-first: önce internetten al, başarısız olursa cache'den
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
