// util.js — pembantu MURNI. RNG selalu disuntikkan sebagai parameter agar setiap fungsi
// di sini bisa diuji secara deterministik.

/** Fisher–Yates. Tidak mengubah larik masukan. */
export function shuffle(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** n elemen berbeda, diambil acak. */
export const pickN = (arr, n, rng = Math.random) => shuffle(arr, rng).slice(0, n);

/** Pembangkit acak deterministik untuk uji dan untuk papan yang dapat direproduksi. */
export function seededRng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}

export const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
