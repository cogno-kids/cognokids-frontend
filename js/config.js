// config.js — sumber kebenaran tunggal CognoKids Explorer v3.
//
// PRINSIP DUA LAPIS (diadopsi dari ViaMath): layar anak memakai bahasa pengalaman;
// label riset (EK1..EK4, nama dimensi NASA-TLX) hidup di berkas ini dan HANYA dibaca oleh
// modul skoring, ekspor, dan mode peneliti. Tidak boleh ada satu pun string "EK1".."EK4"
// yang sampai ke DOM layar anak — itu memicu demand characteristics.
//
// PEMETAAN dimensi (item → EK, game → EK) mengikuti proposal §2.1.5 Tabel 2.2 dan §3
// Tabel 3.6, dan tidak boleh diubah tanpa memperbarui naskah metode.
//
// BUNYI ITEM ditulis ulang seluruhnya agar layak untuk anak kelas 3 — lihat blok
// komentar VACS_ITEMS di bawah. Yang diukur tetap sama.

export const APP = {
  name: 'CognoKids Explorer',
  version: '3.7.1',
  schema: 3,          // versi skema data; ikut di setiap baris ekspor
  storageKey: 'cognokids_v3',
  queueKey: 'cognokids_queue_v1',
  // Kosongkan ('') untuk mode offline-only — aplikasi tetap berjalan penuh.
  baseUrl: '',
  fetchTimeout: 8000,
};

// ── Kondisi pengukuran ───────────────────────────────────────────────────────
// Proposal §3.5: "kondisi pengukuran (A = Pagi / B = Siang / C = Sore)".
// v2.1 menetapkan 'A' secara paksa dan tidak pernah menanyakannya — cacat KON-1.
// Di v3 ini WAJIB dipilih di layar login.
export const KONDISI = [
  { id: 'A', label: 'Pagi',  jam: '07.00–09.30' },
  { id: 'B', label: 'Siang', jam: '09.30–12.00' },
  { id: 'C', label: 'Sore',  jam: '12.00–15.00' },
];

// ── Item VACS ────────────────────────────────────────────────────────────────
// `tlx` dan `ek` adalah label riset — tidak pernah dirender di layar anak.
//
// BENTUK PERTANYAAN. Keenam item memakai satu pola: "Tadi kamu ...?" — kalimat tanya
// biasa, konteks waktu di DEPAN.
//
// Pendek saja tidak cukup. Kalimat pendek pun membingungkan kalau memuat:
//   • MODAL — "harus berpikir keras": anak bertanya, harus? disuruh siapa?
//   • KATA INTROSPEKTIF — "merasa buru-buru": anak bilang "aku buru-buru", titik.
//   • BINGKAI META — "Menurutmu, ...": menilai diri sendiri dulu, baru menjawab.
//   • METAFORA — "berpikir keras": berpikir tidak punya kekerasan.
//   • RAGAM FORMAL — "bergerak" ketika anak memakai "gerak".
// Semua dibuang. Yang ditanyakan sekarang keadaan konkret yang bisa dirasakan langsung.
//
// Bunyi lama memakai pola "Seberapa ... kamu tadi?". Itu keliru untuk anak 8–9 tahun,
// bukan karena katanya sulit, melainkan karena bentuknya:
//
//   • "Seberapa" adalah kata tanya DERAJAT. Ia meminta anak mengukur keadaan batinnya
//     sendiri lalu menaruhnya pada suatu skala — dua langkah berpikir sekaligus, sebelum
//     ia sempat melihat pilihan jawabannya. Padahal skala emoji di bawahnya memang sudah
//     bertugas menyediakan derajat itu; stem-nya tidak perlu ikut memintanya.
//
//   • Orang Indonesia tidak bertanya begitu kepada anak kecil. Yang alami adalah
//     "Tadi capek, nggak?", bukan "Seberapa capek kamu tadi?".
//
//   • "tadi" di UJUNG kalimat membuat konteks waktunya baru tiba setelah seluruh kalimat
//     selesai dibaca. Anak yang membaca pelan sudah menafsirkan pertanyaannya sebagai
//     "sekarang" sebelum sampai ke kata terakhir.
//
//   • "harus" pada "harus berpikir keras" menambah modal keharusan yang abstrak.
//
// Bunyi lama juga menanyakan lebih dari satu hal pada V2 ("terburu-buru ATAU panik") dan
// V6 ("stres, kesal, ATAU tidak nyaman"), dan memakai serapan "panik" serta "stres".
//
// LABEL SKALA memakai tangga yang sama di lima dari enam item —
// Tidak · Sedikit · Lumayan · <kata dari pertanyaan> · <kata> sekali — supaya anak cukup
// memahaminya sekali, lalu mengenalinya 23 kali berikutnya. V4 keluar dari pola itu karena
// ia menilai mutu, bukan intensitas.
//
// Yang DIUKUR tidak berubah: dimensi NASA-TLX tiap item tetap, arah skala tetap, dan
// `reversed` pada V4 tetap benar karena "bagus" naik searah keberhasilan.
export const VACS_ITEMS = [
  {
    id: 'V1', tlx: 'Mental Demand', ek: 'EK2', reversed: false,
    childText: 'Tadi kamu banyak berpikir?',
    emoji: ['😴', '🙂', '😐', '😓', '😵'],
    anchors: ['Tidak', 'Sedikit', 'Lumayan', 'Banyak', 'Banyak sekali'],
  },
  {
    id: 'V2', tlx: 'Temporal Demand', ek: 'EK3', reversed: false,
    childText: 'Tadi kamu buru-buru?',
    emoji: ['😌', '🙂', '😐', '😬', '😰'],
    anchors: ['Tidak', 'Sedikit', 'Lumayan', 'Buru-buru', 'Buru-buru sekali'],
  },
  {
    id: 'V3', tlx: 'Physical Demand', ek: 'EK4', reversed: false,
    childText: 'Tadi kamu banyak gerak?',
    emoji: ['✋', '👆', '👏', '👋', '🙌'],
    anchors: ['Tidak', 'Sedikit', 'Lumayan', 'Banyak', 'Banyak sekali'],
  },
  {
    id: 'V4', tlx: 'Performance', ek: 'EK1', reversed: true,
    childText: 'Tadi kamu main bagus?',
    emoji: ['👎', '😔', '😐', '😄', '🌟'],
    anchors: ['Tidak', 'Sedikit', 'Lumayan', 'Bagus', 'Bagus sekali'],
  },
  {
    id: 'V5', tlx: 'Effort', ek: 'EK2', reversed: false,
    childText: 'Tadi kamu berusaha keras?',
    emoji: ['😌', '🙂', '😐', '💪', '😤'],
    anchors: ['Tidak', 'Sedikit', 'Lumayan', 'Keras', 'Keras sekali'],
  },
  {
    id: 'V6', tlx: 'Frustration', ek: 'EK1', reversed: false,
    childText: 'Tadi kamu kesal?',
    emoji: ['😊', '🙂', '😕', '😟', '😠'],
    anchors: ['Tidak', 'Sedikit', 'Lumayan', 'Kesal', 'Kesal sekali'],
  },
];

// ── Dimensi ergonomi kognitif ────────────────────────────────────────────────
// `direction` adalah field yang mencegah kembalinya cacat komposit v2.1: komposit
// TIDAK PERNAH menjumlah `scores`, melainkan dihitung dari beban (lihat scoring.js).
export const DIMENSIONS = [
  { id: 'EK1', name: 'Kenyamanan Psikologis', direction: 'higher_better', items: ['V4', 'V6'] },
  { id: 'EK2', name: 'Beban Belajar',         direction: 'lower_better',  items: ['V1', 'V5'] },
  { id: 'EK3', name: 'Distraksi Lingkungan',  direction: 'lower_better',  items: ['V2'] },
  { id: 'EK4', name: 'Keleluasaan Aktivitas', direction: 'higher_better', items: ['V3'] },
];

// ── Mini-game ────────────────────────────────────────────────────────────────
// `childName` dipakai di layar anak — Bahasa Indonesia, dan menyebut apa yang benar-benar
// dikerjakan. Nama lamanya (Memory Maze, Focus Tower, Puzzle Emosi, Move & Match) tiga di
// antaranya berbahasa Inggris, padahal ia teks TERBESAR di layar intro; dan "Puzzle Emosi"
// menjanjikan emosi padahal isinya angka.
//
// `id`, `ek`, dan `tlx` TIDAK berubah — identitas riset tetap seperti di naskah.
// Urutan larik ini adalah urutan baku sesuai proposal Tabel 3.6.
export const GAMES = [
  {
    id: 'mm', childName: 'Ingat Gambar', emoji: '🧩', ek: 'EK2', tlx: 'Mental Demand, Effort',
    intro: 'Ingat gambarnya. Nanti kamu cari di antara gambar lain!',
    // Tabel 3.6: 2 babak, 3 → 4 gambar, waktu mengingat 8 dan 6 detik.
    // v2.1 memakai 5 gambar di babak 2 — menyimpang dari naskah (cacat MM-4).
    rounds: [{ targets: 3, showMs: 8000, options: 6 }, { targets: 4, showMs: 6000, options: 8 }],
  },
  {
    id: 'ft', childName: 'Cocokkan Bentuk', emoji: '🏗️', ek: 'EK3', tlx: 'Temporal Demand',
    intro: 'Ketuk bentuk yang sama dengan balok!',
    targetScore: 8,
    distractorFromScore: 3,   // distraktor mulai muncul setelah skor ini
  },
  {
    id: 'pe', childName: 'Susun Angka', emoji: '🧸', ek: 'EK1', tlx: 'Frustration, Performance',
    intro: 'Geser kotaknya. Urutkan angka 1 sampai 8!',
    // Keputusan D3: 90 detik untuk KEDUA babak (v2.1 memberi 90 lalu 75 — tidak sebanding).
    rounds: 2,
    timerSec: 90,
    stressCooldownMs: 10000,  // cacat 4.4: v2.1 tanpa jeda dan memperlihatkan pencacahnya
  },
  {
    id: 'mv', childName: 'Cari Pasangan', emoji: '🃏', ek: 'EK4', tlx: 'Physical Demand',
    intro: 'Geser kartu ke kartu yang sama!',
    // Tabel 2.2 mendeklarasikan data objektif "jumlah sentuhan & gerakan layar".
    // v2.1 tak pernah mencatatnya. v3 memakai mekanik SERET agar tuntutan fisiknya nyata
    // dan terukur (touchCount, jarak geser), sesuai nama gamenya sendiri.
    rounds: [{ pairs: 3 }, { pairs: 4 }],
  },
];

// ── Penyeimbangan urutan (opsional) ──────────────────────────────────────────
// Proposal menetapkan urutan tetap, jadi default-nya MATI agar desain tidak berubah
// diam-diam. Dihidupkan hanya bila penyeimbangan urutan diputuskan sebagai revisi desain;
// bila hidup, kolom `gameOrder` di ekspor mencatat urutan sebenarnya per peserta.
export const COUNTERBALANCE = false;

// ── Kategori skor ────────────────────────────────────────────────────────────
// Keputusan D2: skala e2s tidak pernah menyentuh 0 atau 100, sehingga rentang riil
// adalah 10–90. Pita dihitung terhadap rentang riil itu, bukan terhadap 0–100 —
// kalau tidak, dua pita terluar hanya separuh terpakai.
export const KATEGORI = [
  { min: 74, label: 'Optimal',       emoji: '🟢', color: '#10B981' },
  { min: 58, label: 'Baik',          emoji: '🔵', color: '#3B82F6' },
  { min: 42, label: 'Cukup',         emoji: '🟡', color: '#F59E0B' },
  { min: 26, label: 'Rendah',        emoji: '🟠', color: '#F97316' },
  { min: 0,  label: 'Sangat Rendah', emoji: '🔴', color: '#EF4444' },
];

export const kategoriOf = (v) => KATEGORI.find((k) => v >= k.min) ?? KATEGORI.at(-1);
