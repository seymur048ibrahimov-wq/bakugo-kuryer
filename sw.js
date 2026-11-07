/* =====================================================================
   BakuGo — Kuryer — Service Worker
   • Oflayn iş: tətbiqin qabığı keşdə saxlanılır (internet kəsiləndə də açılır)
   • Push bildirişləri: Firebase Cloud Messaging (FCM) mesajlarını göstərir
   • Bildirişə toxunanda tətbiq açılır / önə gəlir
   Firestore/Firebase/Google sorğuları KEŞLƏNMİR — canlı məlumat həmişə serverdən gəlir.
   ===================================================================== */
const APP = 'kuryer';
const VERSION = 'bakugo-' + APP + '-20261107-1929';
const HTML = './kuryer.html';
const PRECACHE = [
  HTML,
  './kuryer-manifest.json',
  './icons/kuryer-96.png',
  './icons/kuryer-192.png',
  './icons/kuryer-512.png',
  './icons/kuryer-maskable-512.png',
  './icons/kuryer-badge.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    /* biri tapılmasa belə qalanları keşlə (addAll hamısını ləğv edərdi) */
    await Promise.all(PRECACHE.map((u) => cache.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('bakugo-' + APP + '-') && k !== VERSION).map((k) => caches.delete(k)));
    if (self.registration.navigationPreload) { try { await self.registration.navigationPreload.enable(); } catch (e) {} }
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING' || (event.data && event.data.type === 'SKIP_WAITING')) self.skipWaiting();
});

/* ---------------- Oflayn keş ---------------- */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;           /* Firebase, Google Maps və s. — toxunma */

  if (req.mode === 'navigate') {
    /* Səhifə: əvvəl internet (həmişə ən yeni versiya), alınmasa keş */
    event.respondWith((async () => {
      try {
        const preload = event.preloadResponse ? await event.preloadResponse : null;
        const res = preload || await fetch(req);
        if (res && res.ok) { const c = await caches.open(VERSION); c.put(HTML, res.clone()).catch(() => {}); }
        return res;
      } catch (e) {
        const c = await caches.open(VERSION);
        return (await c.match(HTML)) ||
          new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BakuGo</title>' +
            '<body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui;background:#111;color:#eee;text-align:center">' +
            '<div><div style="font-size:42px">📡</div><h2>İnternet bağlantısı yoxdur</h2><p style="opacity:.7">Bağlantı bərpa olunanda səhifəni yeniləyin.</p></div>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
      }
    })());
    return;
  }

  /* Statik fayllar (ikon, manifest, şəkil): keşdən dərhal, arxada yenilə */
  event.respondWith((async () => {
    const c = await caches.open(VERSION);
    const hit = await c.match(req);
    const net = fetch(req).then((res) => { if (res && res.ok && res.type === 'basic') c.put(req, res.clone()).catch(() => {}); return res; }).catch(() => null);
    return hit || (await net) || new Response('', { status: 504 });
  })());
});

/* ---------------- Push bildirişləri ---------------- */
function readPayload(event) {
  let raw = {};
  try { raw = event.data ? event.data.json() : {}; } catch (e) { try { raw = { data: { body: event.data.text() } }; } catch (x) {} }
  const d = Object.assign({}, raw.data || {}, (raw.notification || {}));
  /* FCM bəzən mesajı "data" altında, bəzən birbaşa göndərir */
  ['title', 'body', 'url', 'tag', 'icon', 'image', 'requireInteraction', 'sound'].forEach((k) => { if (d[k] == null && raw[k] != null) d[k] = raw[k]; });
  return d;
}

self.addEventListener('push', (event) => {
  const d = readPayload(event);
  const title = d.title || 'BakuGo';
  const options = {
    body: d.body || '',
    icon: d.icon || './icons/kuryer-192.png',
    badge: './icons/kuryer-badge.png',
    image: d.image || undefined,
    tag: d.tag || undefined,
    renotify: !!d.tag,
    requireInteraction: d.requireInteraction === '1' || d.requireInteraction === true,
    vibrate: [220, 120, 220, 120, 320],
    timestamp: Date.now(),
    data: { url: d.url || HTML, orderId: d.orderId || '' }
  };
  event.waitUntil((async () => {
    await self.registration.showNotification(title, options);
    /* açıq tətbiqə xəbər ver (səs, toast, siyahını yeniləmək üçün) */
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    list.forEach((c) => c.postMessage({ type: 'bakugo-push', title, body: options.body, data: d }));
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || HTML, self.location.href).href;
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) {
      if (c.url.split('#')[0].split('?')[0] === new URL(HTML, self.location.href).href) {
        await c.focus();
        c.postMessage({ type: 'bakugo-push-click', data: event.notification.data || {} });
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});

/* Brauzer push abunəliyini yeniləyəndə tətbiq açılan kimi token yenidən yazılacaq */
self.addEventListener('pushsubscriptionchange', () => {});
