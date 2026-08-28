// games/puzzle-logic.js — logika 8-puzzle. MURNI: tanpa DOM, waktu, atau acak tak tersuntik.
//
// Cacat §6.3 (P2) v2.1: papan dibangkitkan lewat langkah acak. Seluruh 400 papan yang diuji
// memang solvable — pembangkitnya berbasis langkah legal, bukan pengacakan buta, dan itu
// bagus. Tetapi tingkat kesulitannya berkisar 2 sampai 24 langkah optimal (median 14):
// seorang anak bisa mendapat papan yang selesai dalam dua geseran sementara temannya
// mendapat papan dua belas kali lebih sulit. Sekitar 0,75% pembangkitan bahkan menghasilkan
// papan yang sudah tersusun sejak awal. Karena PE_langkah dibandingkan ANTARPESERTA, variasi
// itu masuk langsung ke data sebagai derau.
//
// Catatan tambahan dari pemeriksaan: posisi kotak kosong pada papan awal v2.1 hanya pernah
// muncul di indeks genap, yang menandakan jumlah langkah pengacakan selalu genap —
// separuh ruang keadaan tak pernah terpakai.
//
// Di v3 dipakai HIMPUNAN PAPAN TETAP yang semuanya berjarak solusi sama persis, diverifikasi
// lewat BFS di test/games.test.mjs.

export const GOAL = [1, 2, 3, 4, 5, 6, 7, 8, null];

const enc = (b) => b.map((t) => (t === null ? '0' : t)).join('');
const dec = (s) => [...s].map((c) => (c === '0' ? null : Number(c)));

/** Indeks yang bisa bertukar dengan kotak kosong. */
export function neighbors(empty) {
  const r = Math.floor(empty / 3), c = empty % 3;
  const out = [];
  if (r > 0) out.push(empty - 3);
  if (r < 2) out.push(empty + 3);
  if (c > 0) out.push(empty - 1);
  if (c < 2) out.push(empty + 1);
  return out;
}

/** Paritas inversi — hanya separuh dari 9! susunan yang bisa diselesaikan. */
export function solvable(board) {
  const t = board.filter((x) => x !== null);
  let inv = 0;
  for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) if (t[i] > t[j]) inv++;
  return inv % 2 === 0;
}

export const isSolved = (board) => enc(board) === enc(GOAL);

/**
 * BFS penuh dari keadaan tujuan: jarak optimal SETIAP keadaan yang bisa dicapai.
 * 181.440 keadaan — sekitar 0,2 detik, dan hasilnya di-cache.
 * Dipakai untuk memverifikasi himpunan papan, bukan di jalur permainan.
 */
let _peta = null;
export function distanceMap() {
  if (_peta) return _peta;
  const peta = new Map();
  const mulai = enc(GOAL);
  peta.set(mulai, 0);
  let frontier = [mulai];
  let d = 0;
  while (frontier.length) {
    d += 1;
    const next = [];
    for (const s of frontier) {
      const empty = s.indexOf('0');
      for (const n of neighbors(empty)) {
        const a = [...s];
        [a[empty], a[n]] = [a[n], a[empty]];
        const key = a.join('');
        if (!peta.has(key)) { peta.set(key, d); next.push(key); }
      }
    }
    frontier = next;
  }
  _peta = peta;
  return peta;
}

/** Jarak solusi optimal sebuah papan; null bila tak terselesaikan. */
export function optimalDistance(board) {
  return distanceMap().get(enc(board)) ?? null;
}

/** Semua papan berjarak tepat `d` dari tujuan. */
export function boardsAtDistance(d) {
  const out = [];
  for (const [k, v] of distanceMap()) if (v === d) out.push(dec(k));
  return out;
}

// ── Himpunan papan tetap ─────────────────────────────────────────────────────
// Semua berjarak solusi TEPAT 14 langkah — median yang ditemukan pemeriksaan pada v2.1,
// sehingga kesulitannya sebanding dengan gelombang data sebelumnya sambil menghilangkan
// variasi 2–24 langkah yang selama ini masuk ke data sebagai derau.
// Diverifikasi lewat BFS penuh di test/games.test.mjs — bukan diperiksa dengan mata.
//
// CATATAN tentang posisi kotak kosong. Pemeriksaan v2.1 mencatat bahwa kotak kosong hanya
// pernah muncul di indeks genap dan menyimpulkan "separuh ruang keadaan tak pernah terpakai".
// Setelah dihitung, itu ternyata BUKAN cacat pembangkit melainkan konsekuensi matematis:
// setiap geseran mengubah (baris+kolom) kotak kosong sebesar satu, sehingga paritasnya
// terikat pada paritas jumlah langkah. Untuk jarak solusi genap seperti 14, kotak kosong
// HARUS berada di salah satu dari indeks 0, 2, 4, 6, 8 — tidak ada pilihan lain.
// Menyeragamkan kesulitan dan menyebar posisi kosong ke seluruh sembilan indeks adalah dua
// tujuan yang saling meniadakan; di sini keseragaman kesulitan yang dimenangkan, karena
// itulah yang masuk ke dalam data. Kelima papan di bawah mencakup seluruh lima posisi yang
// mungkin pada jarak 14.
export const JARAK_BAKU = 14;

export const PAPAN_TETAP = [
  [null, 8, 2, 5, 7, 3, 1, 4, 6],
  [5, 8, null, 1, 7, 2, 4, 6, 3],
  [5, 8, 2, 7, null, 3, 1, 4, 6],
  [5, 8, 2, 1, 3, 6, null, 4, 7],
  [5, 8, 2, 4, 1, 3, 7, 6, null],
];

/** Ambil papan untuk babak ke-n, tanpa mengulang dalam satu sesi. */
export function pickBoards(n, rng = Math.random) {
  const idx = PAPAN_TETAP.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, n).map((i) => [...PAPAN_TETAP[i]]);
}
