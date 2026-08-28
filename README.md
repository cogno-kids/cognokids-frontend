# CognoKids Explorer 🧠

**Alat ukur ergonomi kognitif berbasis permainan untuk siswa kelas 3–6 SD.**

Anak memainkan empat mini-game, lalu menjawab enam pertanyaan bergambar tentang
perasaannya. Dari situ terukur empat dimensi ergonomi kognitif — tanpa anak merasa
sedang diuji.

### 👉 Coba: **[cogno-kids.github.io/cognokids-frontend](https://cogno-kids.github.io/cognokids-frontend/)**

---

## Empat permainan

🧩 **Memory Maze** — mengingat lalu mengenali kembali gambar
🏗️ **Focus Tower** — menyortir balok jatuh di tengah gangguan visual
🧸 **Puzzle Emosi** — menyusun angka 1–8 dengan tombol "aku stres" kapan saja
🃏 **Move & Match** — menyeret kartu ke pasangannya

Sekitar 25 menit per anak. Setiap permainan diikuti enam pertanyaan emoji (VACS,
adaptasi NASA-TLX untuk anak).

## Untuk siapa

- **Siswa kelas 3–6 SD** — bisa di HP, tablet, atau komputer.
- **Pendamping/peneliti** — layar peneliti tersembunyi menyimpan skor, ekspor CSV, dan
  pengaturan perangkat.

Berjalan penuh **tanpa internet** setelah sekali dibuka. Data tersimpan di perangkat dan
disinkronkan saat ada sinyal.

## Menjalankan

```bash
python3 -m http.server 8080     # buka http://localhost:8080
npm test                        # 136 uji
```

Tanpa build step, tanpa dependensi. Semua aset ada di repo ini.

## Menyiapkan perangkat lapangan

Sekali per ponsel, lewat layar peneliti (ketuk **nomor versi** 5× di layar penutup —
sebelumnya bintang besar di tengah layar, yang justru benda paling menarik untuk
diketuk berkali-kali oleh anak yang baru selesai bermain):

1. **Ganti PIN** — repo ini publik, jadi PIN bawaan diketahui umum.
2. **Isi URL backend dan token tulis**, lalu tekan Simpan & uji koneksi.
   Kosongkan URL untuk mode luring penuh.

⚠️ Unduh `sessions.csv` **dan** `trials.csv` sebelum menghapus arsip perangkat.
Setelah dihapus tidak bisa dikembalikan.

## Peneliti

**MIRA RAHAYU, S.T., M.T.**

Program Doktor Teknik Industri
Fakultas Teknik — Universitas Sebelas Maret

---

Backend: [cognokids-backend](https://github.com/cogno-kids/cognokids-backend) (privat)
