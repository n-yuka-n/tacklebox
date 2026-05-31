const CACHE = 'tacklebox-v2';
const SHELL = ['/', '/index.html', '/manifest.json', '/icon.svg'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // APIコールはSWを素通し
  if (url.includes('googleapis.com')) return;
  if (url.includes('google.com'))     return;
  if (url.includes('anthropic.com'))  return;

  // ナビゲーション以外のPOSTは素通し
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.ok) {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      });

      // キャッシュがあれば即返しつつバックグラウンドで更新
      // なければネットワーク待ち（失敗時は空レスポンスでなくエラーを伝播）
      return cached || network;
    })
  );
});
