// ===== BakuGo Kuryer Service Worker =====
// Yalnız statik "app shell" faylları keşlənir. Firebase/Firestore sorğuları
// (sifariş statusu, canlı yer, bildirişlər) HEÇ VAXT keşlənmir — həmişə
// şəbəkədən təzə çəkilir ki, kuryer köhnə/səhv data görməsin.

/* ---- FIREBASE CLOUD MESSAGING (arxa fon push bildirişləri) ----
   index.html-də getToken() çağırılanda registration kimi məhz bu fayl
   (sw.js) verilir, ona görə push mesajını - tətbiq bağlı
   olanda belə - göstərmək məhz burada baş verməlidir. */
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBQIDfObXpxNa1hVAYDmigSi9u49y_BJQc",
  authDomain: "bkaugo.firebaseapp.com",
  projectId: "bkaugo",
  storageBucket: "bkaugo.firebasestorage.app",
  messagingSenderId: "568740538737",
  appId: "1:568740538737:web:9b2ab40d0b728789a1aed0"
});

const messaging = firebase.messaging();

// Tətbiq bağlı/arxa fonda olanda gələn push bildirişi göstər
messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || "BakuGo Kuryer";
  const options = {
    body: (payload.notification && payload.notification.body) || "Yeni sifariş var!",
    icon: "./icons/icon-192.png",
    badge: "./icons/icon-192.png",
    data: payload.data || {}
  };
  self.registration.showNotification(title, options);
});

// Bildirişə klik ediləndə tətbiqi aç/fokusla
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow("./index.html");
    })
  );
});

const CACHE_NAME = "bakugo-kuryer-cache-v1"; // hər yeni deploy-da versiyanı artırın (v2, v3...)

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-384.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./icons/icon-1024.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== "GET") return;

  // Firebase/Firestore/Google API sorğularına toxunma - canlı data həmişə şəbəkədən
  if (
    url.hostname.includes("firestore.googleapis.com") ||
    url.hostname.includes("firebaseio.com") ||
    url.hostname.includes("googleapis.com") ||
    (url.hostname.includes("gstatic.com") && url.pathname.includes("firebase"))
  ) {
    return;
  }

  // Naviqasiya sorğuları: əvvəlcə şəbəkə, olmasa keşdən son görülən halı ver
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", resClone));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Digər statik fayllar: keş varsa onu ver, yoxdursa şəbəkəyə get
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200 && url.origin === self.location.origin) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});
