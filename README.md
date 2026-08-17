# BakuGo Kuryer — PWA GitHub Pages Quraşdırması

Bu, **müştəri tətbiqindən (bakugo) tamam AYRI** bir PWA-dır. Kuryerlər üçün
ayrıca ikonu, ayrıca adı və ayrıca install prosesi olacaq.

```
bakugo-kuryer/
├── index.html          ← əsas kuryer tətbiqi
├── manifest.json        ← PWA manifesti
├── sw.js                 ← Service Worker (offline keş + push bildiriş)
├── README.md
└── icons/
    ├── icon-192.png
    ├── icon-384.png
    ├── icon-512.png
    ├── icon-512-maskable.png
    └── icon-1024.png
```

## 1. Yeni GitHub repo yarat

- github.com → **New repository**
- Ad ver, məsələn `bakugo-kuryer` (Public seç)
- **Create repository**

> ⚠️ Bunu **eyni `bakugo` repo-suna qarışdırma** — ayrı repo olmalıdır, əks
> halda iki tətbiqin service worker-ləri bir-birinin keşinə mane ola bilər.

## 2. Faylları yüklə

**Add file → Upload files** ilə:
- `index.html`, `manifest.json`, `sw.js`, `README.md` fayllarını sürüklə-burax
- `icons` qovluğunu (5 şəkillə birlikdə) tam sürüklə-burax
- **Commit changes**

Fayl adlarını **dəyişmə** — `index.html` daxilində bu adlar hərfi-hərfinə
istinad olunur (`manifest.json`, `sw.js`, `icons/icon-192.png` və s.).

## 3. GitHub Pages-i aktivləşdir

- Repo → **Settings → Pages**
- **Source**: `Deploy from a branch` → **Branch**: `main`, qovluq `/ (root)` → **Save**
- Bir neçə dəqiqə sonra sayt bu ünvanda olacaq:
  `https://İSTİFADƏÇİ_ADIN.github.io/bakugo-kuryer/`

## 4. Yoxla və quraşdır (install et)

1. Linki telefonda Chrome-da aç
2. **⋮ → "Install app" / "Ana ekrana əlavə et"**
3. Ana ekrandan aç — brauzer zolağı olmadan, tam ekran açılmalıdır

İndi telefonunda **iki ayrı ikon** olacaq: **BakuGo** (müştəri) və
**BakuGo Kuryer** (kuryer) — hər biri öz login/rol sistemi ilə müstəqil işləyir.

## 5. Push bildirişləri aktivləşdir (VAPID key)

Kuryer tətbiqi yeni sifariş gələndə push bildiriş göndərmək üçün Firebase
Cloud Messaging (FCM) istifadə edir, amma `index.html` içində bu sətir
hələ **doldurulmayıb**:

```js
const VAPID_KEY = "BURAYA_FIREBASE_CONSOLE_VAPID_KEY_YAZIN";
```

Doldurmaq üçün:
1. Firebase Console → layihən (`bkaugo`) → **Project settings → Cloud Messaging**
2. **Web Push certificates** bölməsində "Generate key pair" (əgər yoxdursa) →
   çıxan açarı kopyala
3. `index.html`-də `VAPID_KEY = "..."` yerinə həmin açarı yapışdır
4. Yenidən GitHub-a yüklə (Upload files → Commit)

Bu addım olmadan tətbiq açılacaq və işləyəcək, sadəcə **push bildirişlər
gəlməyəcək** (kuryer tətbiqi bağlı olanda yeni sifarişdən xəbərsiz qalar).

## Qeydlər

- `manifest.json`-da `theme_color: #d4af37` (qızılı) və
  `background_color: #0d0d0d` tətbiqin öz dizaynına uyğunlaşdırılıb.
- `sw.js` həm statik faylları keşləyir, həm də arxa fonda (tətbiq bağlı
  olanda) FCM push bildirişlərini göstərir — Firebase/Firestore canlı data
  sorğularına toxunmur.
- Hər dəfə `index.html`, manifest və ya ikonları yenilədikdən sonra
  `sw.js` içindəki `CACHE_NAME` dəyərini artır (v1 → v2), əks halda
  kuryerlər köhnə keşlənmiş versiyanı görə bilər.
