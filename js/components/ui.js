// components/ui.js — rangka layar yang dipakai bersama.
//
// Sampai v3.8 setiap berkas layar menulis sendiri markup bilah atasnya. Delapan salinan
// hampir-sama, sehingga setiap perubahan rupa harus dikerjakan delapan kali dan satu di
// antaranya pasti tertinggal — persis yang terjadi pada tiga layar yang masih menampilkan
// nama permainan dua kali. Di sini rangkanya cuma satu.
//
// Modul ini MURNI penyaji: tidak menyentuh Store, tidak membaca localStorage, tidak
// memakai waktu. Itu disengaja — berkas permainan mengimpornya, dan berkas permainan
// diimpor oleh uji yang berjalan di Node tanpa DOM.

import { escapeHtml } from '../util.js';

/**
 * Warna satu permainan → variabel CSS.
 * Bentuk `warna`: { g, tua, terang, teks } — lihat GAMES di config.js, di mana setiap
 * pasangan sudah dihitung kontrasnya.
 */
export function tema(warna) {
  if (!warna) return '';
  return `--g:${warna.g};--g-tua:${warna.tua};--g-terang:${warna.terang};--g-teks:${warna.teks}`;
}

/** Bintang SVG. BUKAN emoji ⭐ — bentuk emoji berbeda antar merek ponsel, dan penanda
 *  kemajuan tidak boleh ikut berbeda. */
const BINTANG = 'M12 2.6 15.1 9l7 1-5.1 4.9 1.3 6.9L12 18.6 5.7 21.8 7 14.9 1.9 10l7-1z';
const bintang = (penuh, baru) =>
  `<svg viewBox="0 0 24 24" class="${baru ? 'baru' : ''}" aria-hidden="true" focusable="false">
     <path d="${BINTANG}" class="${penuh ? 'penuh' : 'kosong'}"/>
   </svg>`;

/**
 * Jejak bintang: kemajuan sesi sebagai gambar.
 *
 * Bintang diberikan untuk MENYELESAIKAN permainan, tidak pernah untuk bermain bagus.
 * Setiap anak mengumpulkan keempatnya. Hadiah yang bergantung pada mutu permainan akan
 * mengingkari janji "tidak ada yang dinilai" yang diulang di hampir setiap layar — dan
 * mencemari justru perasaan yang ditanyakan sesudahnya.
 */
export function jejak(selesai, total, baruSaja = false) {
  const isi = Array.from({ length: total }, (_, i) =>
    bintang(i < selesai, baruSaja && i === selesai - 1)).join('');
  return `<div class="jejak" role="img"
               aria-label="${selesai} dari ${total} permainan sudah selesai">${isi}</div>`;
}

/**
 * Bilah atas. `sub` boleh kosong. `kanan` diisi markup apa pun — jejak bintang di layar
 * pembuka, kapsul waktu di Susun Angka.
 */
export function bilah({ emoji = '', judul, sub = '', kanan = '', warna = null }) {
  const gaya = tema(warna);
  return `<div class="topbar"${gaya ? ` style="${gaya}"` : ''}>
      ${emoji ? `<div class="medali" aria-hidden="true">${emoji}</div>` : ''}
      <div style="flex:1;min-width:0">
        <h1>${escapeHtml(judul)}</h1>
        ${sub ? `<div class="sub">${escapeHtml(sub)}</div>` : ''}
      </div>
      ${kanan}
    </div>`;
}

/** Pembungkus isi layar. Warna permainan menempel di sini agar seluruh isinya mewarisi. */
export function layar(isi, { warna = null, kelas = '' } = {}) {
  const gaya = tema(warna);
  return `<div class="screen ${kelas}"${gaya ? ` style="${gaya}"` : ''}>${isi}</div>`;
}

const KERTAS_WARNA = ['#F5A623', '#3B67F0', '#11865A', '#D73A4D', '#7B5CF0', '#FF8A3D'];

/**
 * Hujan kertas warna. Dipanggil HANYA saat sesuatu selesai — tidak pernah untuk satu
 * jawaban benar. Menguatkan umpan balik per-jawaban akan mengubah tuntutan mental dan
 * frustrasi yang justru sedang diukur; merayakan penyelesaian tidak, karena setiap anak
 * sampai ke sana.
 *
 * Mengembalikan fungsi pembersih agar layar yang ditinggalkan lebih dulu tidak
 * meninggalkan elemen menggantung.
 */
export function pesta(jumlah = 26, lamaMs = 2600) {
  if (typeof document === 'undefined') return () => {};
  // Tanpa penjagaan ini, elemennya tetap dibuat lalu disembunyikan CSS — sia-sia pada
  // perangkat yang justru paling lemah.
  if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return () => {};

  const wadah = document.createElement('div');
  wadah.className = 'pesta';
  wadah.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < jumlah; i++) {
    const k = document.createElement('i');
    k.style.left = `${Math.random() * 100}%`;
    k.style.background = KERTAS_WARNA[i % KERTAS_WARNA.length];
    k.style.setProperty('--tunda', `${Math.random() * 0.7}s`);
    k.style.setProperty('--lama', `${1.9 + Math.random() * 1.3}s`);
    wadah.appendChild(k);
  }
  document.body.appendChild(wadah);
  const id = setTimeout(() => wadah.remove(), lamaMs);
  return () => { clearTimeout(id); wadah.remove(); };
}

/** Titik langkah kuesioner — menggantikan <span> bergaya sebaris di vacs.js. */
export function titik(kini, total) {
  const isi = Array.from({ length: total }, (_, i) =>
    `<i class="${i === kini ? 'kini' : i < kini ? 'usai' : ''}"></i>`).join('');
  return `<div class="titik" aria-hidden="true">${isi}</div>`;
}
