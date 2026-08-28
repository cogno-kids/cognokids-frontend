# Font yang dibundel

Aplikasi ini tidak boleh memuat apa pun dari jaringan (sekolah sasaran sering tanpa
sinyal, dan `test/offline.test.mjs` menolak setiap sumber eksternal). Kedua font di
bawah karena itu disalin ke dalam repo, bukan dipanggil dari Google Fonts.

| Berkas | Font | Pemakaian | Ukuran |
|---|---|---|---|
| `fredoka-latin.woff2` | Fredoka (variable, 400–700) | judul, nama permainan, tombol | 29 KB |
| `nunito-latin.woff2`  | Nunito (variable, 400–800)  | seluruh teks bacaan | 39 KB |

Keduanya subset **latin saja** (U+0000–00FF dan tanda baca umum) — cukup untuk Bahasa
Indonesia, dan itulah sebabnya totalnya hanya 68 KB. Emoji tidak berasal dari sini;
ia tetap dilayani font emoji bawaan sistem.

Alasan memilih keduanya: terminal hurufnya membulat dan tinggi-x-nya besar, dua sifat
yang membuat huruf lebih mudah dibedakan oleh pembaca pemula. Fredoka menanggung teks
besar, Nunito menanggung teks bacaan karena tetap jernih pada ukuran kecil yang dibaca
pendamping.

## Lisensi

SIL Open Font License 1.1 — lihat `OFL.txt`. Lisensi ini mengizinkan penyalinan dan
penyertaan ulang seperti di atas, dengan syarat teks lisensinya ikut disertakan.

- Fredoka — © 2016 The Fredoka Project Authors
- Nunito — © 2014 The Nunito Project Authors
