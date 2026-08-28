// archive.js — arsip lokal seluruh sesi yang sudah tuntas di PERANGKAT ini.
//
// Kenapa ini ada. Di lapangan 20–30 anak bergantian memakai satu ponsel, dan "Peserta
// berikutnya" memanggil Store.reset(). Tanpa arsip, satu-satunya salinan data anak
// sebelumnya adalah antrean sinkronisasi — yang hanya berguna bila backend sudah ada dan
// bisa dihubungi. Bila sekolah tanpa sinyal dan backend belum terpasang, data 30 anak
// akan lenyap satu per satu tanpa ada yang menyadarinya.
//
// Arsip ini adalah jaring pengaman terakhir: berdiri sendiri, terpisah dari antrean, dan
// bisa diunduh sebagai CSV kapan saja dari layar peneliti.

import { APP } from './config.js';

const KEY = 'cognokids_archive_v1';
const listeners = new Set();

function baca() {
  try {
    const raw = localStorage.getItem(KEY);
    const a = raw ? JSON.parse(raw) : [];
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

function tulis(arr) {
  try {
    localStorage.setItem(KEY, JSON.stringify(arr));
    listeners.forEach((fn) => fn(arr.length));
    return { ok: true };
  } catch (e) {
    // Kuota penuh. Ini HARUS terlihat pendamping, bukan gagal diam-diam — sisa sesi hari
    // itu tidak akan terarsip sampai data yang ada diunduh dan dibersihkan.
    console.error('[archive] gagal menyimpan:', e);
    return { ok: false, error: String(e?.name || e) };
  }
}

export const Archive = {
  all: baca,
  count: () => baca().length,
  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  /** Dipanggil sekali saat sesi tuntas, SEBELUM peserta berikutnya me-reset store. */
  add({ entry, trials }) {
    const arr = baca();
    // Idempoten: satu sessionId hanya boleh sekali, walau layar penutup dimuat ulang.
    if (arr.some((r) => r.entry?.sessionId === entry.sessionId)) return { ok: true, duplikat: true };
    arr.push({ entry, trials, arsipAt: new Date().toISOString(), appVersion: APP.version });
    return tulis(arr);
  },

  /** Perkiraan pemakaian penyimpanan, untuk ditampilkan ke pendamping. */
  sizeKb() {
    try { return Math.round((localStorage.getItem(KEY)?.length ?? 0) / 1024); }
    catch { return 0; }
  },

  /** Hanya dipanggil setelah pendamping mengunduh DAN mengonfirmasi. */
  clear() { try { localStorage.removeItem(KEY); } catch {} listeners.forEach((fn) => fn(0)); },
};
