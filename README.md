# CognoKids Explorer — Frontend (v3)

Alat ukur ergonomi kognitif berbasis permainan untuk siswa kelas 3–6 SD.
Instrumen penelitian disertasi — **datanya adalah produk**, bukan produk sampingan.

Peneliti: Mira Rahayu, S.T., M.T. — Program Doktor Teknik Industri, Universitas Sebelas Maret

## Menjalankan lokal

```bash
python3 -m http.server 8080     # lalu buka http://localhost:8080
npm test                        # atau: node --test test/*.test.mjs
```

Tidak ada build step dan tidak ada dependensi. Seluruh gaya, skrip, dan ikon berasal dari
repo ini sendiri — **tanpa satu pun CDN** — supaya service worker bisa menyimpan aplikasi
utuh dan sesi tetap bisa dijalankan di sekolah tanpa sinyal.

## Struktur

```
js/config.js     sumber kebenaran tunggal: pemetaan VACS→EK, dimensi, game, kondisi
js/scoring.js    modul MURNI (tanpa DOM/waktu/acak) — teruji, lihat test/
js/store.js      offline-first; snapshot per game; sesi tahan reload
js/api.js        sinkronisasi terverifikasi + antrean yang terlihat
js/router.js     navigasi berbasis keadaan (anak tidak bisa melompat layar)
sw.js            service worker; naikkan CACHE saat berkas berubah
```

## Aturan yang mengikat

1. **`scoring.js` tidak boleh menyentuh DOM, `Date.now()`, `Math.random()`, atau
   `localStorage`.** Fungsi murni, masukan → keluaran. Di situlah kesalahan paling mahal
   bersembunyi dan di situlah ia harus bisa diuji.
2. **Komposit dihitung dari beban, bukan dari skor tampilan.** Arah EK2/EK3 dibaca dari
   field `direction` di `config.js`. Cacat komposit v2.1 hanya bisa kembali bila tabel itu
   diubah secara sadar — dan uji arah akan menangkapnya.
3. **Tidak ada label riset di layar anak.** "EK1".."EK4", nama dimensi NASA-TLX, dan
   pencacah perilaku hidup di `config.js` dan hanya dibaca oleh ekspor & mode peneliti.
4. **Tidak ada sumber eksternal.** Setiap berkas baru yang ikut menyusun cangkang harus
   masuk daftar `SHELL` di `sw.js`.
5. **Skala VACS berentang 10–90, bukan 0–100.** Lihat `scoring.js`.

## Uji

```
test/scoring.test.mjs            mengunci rumus, arah komposit, langit-langit/lantai,
                                 data hilang, properti atas 15.625 kombinasi jawaban
test/store.test.mjs              sesi tahan reload, skema lama, alur game, catatan trial
test/metrics.test.mjs            d′, biaya distraksi, efisiensi puzzle, uji varians
test/export.test.mjs             kolom numerik, pelolosan CSV, format panjang
test/games.test.mjs              pembangkit tiap game; papan puzzle diverifikasi BFS penuh
test/no-research-labels.test.mjs nol label riset di layar anak
test/offline.test.mjs            cakupan precache, nol sumber eksternal, viewport
```

108 uji. Dua di antaranya patut dicatat:

- Uji skoring diverifikasi lewat **uji mutasi**: menanam kembali rumus komposit v2.1
  membuat 7 dari 15 uji merah, sementara uji regresi dimensi tetap hijau.
- `offline.test.mjs` menangkap mode kegagalan yang paling mudah terjadi — menambah modul
  baru lalu lupa mendaftarkannya di `SHELL`. Gejalanya baru muncul saat perangkat sudah
  offline di sekolah, waktu paling buruk untuk menemukannya.

## Menyiapkan perangkat lapangan

Backend **tidak** dikonfigurasi di dalam kode. Di tiap ponsel, sekali saja:

1. Selesaikan satu sesi (atau buka layar penutup), ketuk bintang 5×, masukkan PIN peneliti.
2. Isi URL backend dan token tulis, tekan **Simpan & uji koneksi** — ia benar-benar memanggil
   `/health`, bukan sekadar menyimpan.
3. Kosongkan URL untuk mode luring penuh; data tetap terarsip di perangkat dan bisa diunduh
   sebagai CSV.

Konsekuensinya, berkas yang di-deploy tidak memuat kredensial apa pun. Ini menghapus
kebocoran publik — ia tidak melindungi dari orang yang memegang ponsel yang sudah disiapkan.

## Jangan sampai hilang

Setiap sesi yang tuntas diarsip di perangkat **sebelum** sinkronisasi dicoba. Di lapangan
20–30 anak berbagi satu ponsel dan "Peserta berikutnya" mengosongkan sesi berjalan; arsip
inilah satu-satunya salinan yang tidak bergantung pada jaringan. Unduh `sessions.csv` **dan**
`trials.csv` sebelum menghapus arsip — setelah dihapus, tidak bisa dikembalikan.

## Dokumen

- Pipeline pengembangan: `../../.plans/PIPELINE-COGNOKIDS-V3.md`
- Ledger kemajuan: `../../.plans/LEDGER.md`
- Backend: `../backend/README.md`
- Sumber v2.1 (arsip): `../../.plans/referensi/cognokids-v2.1-tayang.html`
