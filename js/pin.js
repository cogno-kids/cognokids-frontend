// pin.js — PIN mode peneliti, dapat diganti per perangkat.
//
// Ini penghalang terhadap ANAK, bukan terhadap penyerang: seluruh kode klien toh bisa
// dibaca siapa pun, dan repo frontend ini publik. Pengamanan yang sesungguhnya ada di sisi
// server (token tulis dan token baca yang terpisah, lihat backend).
//
// Karena reponya publik, PIN bawaan otomatis diketahui umum. Karena itu ia bisa — dan
// sebaiknya — diganti sekali per perangkat saat penyiapan, lewat layar peneliti. PIN yang
// diganti disimpan hanya di perangkat itu dan tidak pernah masuk kode maupun repo.

const KEY = 'cognokids_pin_v1';
const BAWAAN = '2026';

export function getPin() {
  try { return localStorage.getItem(KEY) || BAWAAN; } catch { return BAWAAN; }
}

export function setPin(baru) {
  const v = String(baru ?? '').trim();
  if (!/^\d{4,8}$/.test(v)) return { ok: false, error: 'PIN harus 4–8 angka' };
  try { localStorage.setItem(KEY, v); return { ok: true }; }
  catch (e) { return { ok: false, error: String(e?.name || e) }; }
}

/** True bila perangkat masih memakai PIN bawaan yang diketahui umum. */
export function pinMasihBawaan() {
  return getPin() === BAWAAN;
}
