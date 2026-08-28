// sw.js — service worker. Cacat 5.2 v2.1: kode menyiapkan antrean offline tetapi aplikasi
// tak punya service worker maupun manifest, sehingga bila sekolah tak punya koneksi saat
// halaman pertama dibuka, aplikasinya tidak termuat sama sekali. Antrean offline hanya
// berguna kalau halamannya sudah lebih dulu tersimpan.
//
// WAJIB: naikkan CACHE setiap kali ISI berkas mana pun berubah.
//
// Strategi di bawah adalah cache-first. Selama nama CACHE tidak berubah, peramban yang
// sudah pernah membuka situs ini akan SELAMANYA menyajikan berkas lama — perbaikan
// apa pun yang di-deploy tidak akan pernah sampai ke perangkat lapangan yang sudah
// dipakai. Ini pernah terjadi: delapan kali isi diubah, nama cache tetap v3.0.0.
//
// test/offline.test.mjs sekarang menghitung sidik jari seluruh berkas SHELL dan gagal
// bila isinya berubah tanpa versi ikut naik, jadi ini tidak bisa terlupa lagi.

const CACHE = 'cognokids-v3.2.0';

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/styles.css',
  './js/app.js',
  './js/config.js',
  './js/scoring.js',
  './js/store.js',
  './js/api.js',
  './js/router.js',
  './js/util.js',
  './js/metrics.js',
  './js/export.js',
  './js/archive.js',
  './js/pin.js',
  './js/pages/login.js',
  './js/pages/vacs.js',
  './js/pages/intro.js',
  './js/pages/selesai.js',
  './js/pages/peneliti.js',
  './js/games/memory-maze.js',
  './js/games/focus-tower.js',
  './js/games/move-match.js',
  './js/games/puzzle-emosi.js',
  './js/games/puzzle-logic.js',
  './assets/icon-192.png',
  './assets/icon-512.png',
];

self.addEventListener('install', (e) => {
  // addAll gagal total bila satu berkas 404 — sengaja: lebih baik instalasi gagal keras
  // daripada aplikasi setengah tersimpan yang rusak saat offline di lapangan.
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // biarkan sinkronisasi backend lewat api.js

  // Cache-first: aplikasi harus termuat identik dengan atau tanpa jaringan.
  e.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request)
        .then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html')); // navigasi saat offline
    }),
  );
});
