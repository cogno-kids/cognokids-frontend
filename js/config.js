// config.js — sumber kebenaran tunggal CognoKids Explorer v3.
//
// PRINSIP DUA LAPIS (diadopsi dari ViaMath): layar anak memakai bahasa pengalaman;
// label riset (EK1..EK4, nama dimensi NASA-TLX) hidup di berkas ini dan HANYA dibaca oleh
// modul skoring, ekspor, dan mode peneliti. Tidak boleh ada satu pun string "EK1".."EK4"
// yang sampai ke DOM layar anak — itu memicu demand characteristics.
//
// Pemetaan di bawah ini mengikuti proposal disertasi §2.1.5 Tabel 2.2 dan §3 Tabel 3.6.
// Jangan ubah tanpa memperbarui naskah metode: setiap perubahan di sini menggeser makna
// data yang sudah terkumpul.

export const APP = {
  name: 'CognoKids Explorer',
  version: '3.0.0',
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
// Teks dan emoji disalin verbatim dari proposal §3 (Tabel 3.6). `tlx` dan `ek` adalah
// label riset — tidak pernah dirender di layar anak.
export const VACS_ITEMS = [
  {
    id: 'V1', tlx: 'Mental Demand', ek: 'EK2', reversed: false,
    childText: 'Seberapa banyak kamu harus berpikir keras tadi?',
    emoji: ['😴', '🙂', '😐', '😓', '🤯'],
    anchors: ['Tidak sama sekali', 'Sedikit', 'Lumayan', 'Banyak', 'Banyak sekali'],
  },
  {
    id: 'V2', tlx: 'Temporal Demand', ek: 'EK3', reversed: false,
    childText: 'Seberapa terburu-buru atau panik kamu tadi?',
    emoji: ['😌', '🙂', '😬', '😰', '😱'],
    anchors: ['Santai sekali', 'Santai', 'Biasa', 'Buru-buru', 'Panik'],
  },
  {
    id: 'V3', tlx: 'Physical Demand', ek: 'EK4', reversed: false,
    childText: 'Seberapa banyak kamu harus bergerak-gerak tadi?',
    emoji: ['🪑', '🤏', '👋', '🤸', '🏃'],
    anchors: ['Diam saja', 'Sedikit', 'Lumayan', 'Banyak', 'Banyak sekali'],
  },
  {
    id: 'V4', tlx: 'Performance', ek: 'EK1', reversed: true,
    childText: 'Kamu merasa berhasil atau gagal tadi?',
    emoji: ['😔', '😕', '😊', '😄', '🏆'],
    anchors: ['Gagal', 'Kurang', 'Lumayan', 'Berhasil', 'Berhasil sekali'],
  },
  {
    id: 'V5', tlx: 'Effort', ek: 'EK2', reversed: false,
    childText: 'Seberapa keras kamu berusaha tadi?',
    emoji: ['😴', '😌', '💪', '😤', '🥵'],
    anchors: ['Tidak berusaha', 'Sedikit', 'Lumayan', 'Keras', 'Keras sekali'],
  },
  {
    id: 'V6', tlx: 'Frustration', ek: 'EK1', reversed: false,
    childText: 'Apakah kamu merasa stres, kesal, atau tidak nyaman tadi?',
    emoji: ['😊', '🙂', '😐', '😟', '😤'],
    anchors: ['Nyaman sekali', 'Nyaman', 'Biasa', 'Kesal', 'Kesal sekali'],
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
// `childName` dipakai di layar anak; `ek` dan `tlx` hanya untuk peneliti & ekspor.
// Urutan larik ini adalah urutan baku sesuai proposal Tabel 3.6.
export const GAMES = [
  {
    id: 'mm', childName: 'Memory Maze', emoji: '🧩', ek: 'EK2', tlx: 'Mental Demand, Effort',
    intro: 'Ingat gambar yang muncul, lalu pilih gambar yang tadi kamu lihat!',
    // Tabel 3.6: 2 babak, 3 → 4 gambar, waktu mengingat 8 dan 6 detik.
    // v2.1 memakai 5 gambar di babak 2 — menyimpang dari naskah (cacat MM-4).
    rounds: [{ targets: 3, showMs: 8000, options: 6 }, { targets: 4, showMs: 6000, options: 8 }],
  },
  {
    id: 'ft', childName: 'Focus Tower', emoji: '🏗️', ek: 'EK3', tlx: 'Temporal Demand',
    intro: 'Klik wadah yang bentuk dan warnanya SAMA dengan balok yang jatuh!',
    targetScore: 8,
    distractorFromScore: 3,   // distraktor mulai muncul setelah skor ini
  },
  {
    id: 'pe', childName: 'Puzzle Emosi', emoji: '🧸', ek: 'EK1', tlx: 'Frustration, Performance',
    intro: 'Susun angka 1 sampai 8 berurutan dengan menggeser kotaknya!',
    // Keputusan D3: 90 detik untuk KEDUA babak (v2.1 memberi 90 lalu 75 — tidak sebanding).
    rounds: 2,
    timerSec: 90,
    stressCooldownMs: 10000,  // cacat 4.4: v2.1 tanpa jeda dan memperlihatkan pencacahnya
  },
  {
    id: 'mv', childName: 'Move & Match', emoji: '🃏', ek: 'EK4', tlx: 'Physical Demand',
    intro: 'Seret kartu ke pasangannya yang gambarnya sama!',
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
