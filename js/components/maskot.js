// components/maskot.js — Puti, burung hantu yang menemani anak.
//
// MENGAPA ADA MASKOT. Sepanjang aplikasi, anak disapa oleh "kami" — "Sekarang kami mau
// tanya", "Nanti kami tanya sedikit" — padahal tidak ada siapa pun di layar. Bagi anak
// delapan tahun itu suara tanpa tubuh. Puti memberi tubuh pada "kami" itu, dan itulah
// satu-satunya tugasnya.
//
// DIGAMBAR SEBAGAI SVG, BUKAN EMOJI. Seluruh "gambar" di aplikasi ini sampai v3.8 adalah
// emoji, yang bentuknya ditentukan merek ponsel: 🦉 di Samsung, iPhone, dan Android murah
// adalah tiga burung yang berbeda. Maskot yang berganti rupa antar perangkat tidak bisa
// dikenali anak sebagai tokoh yang sama. SVG tampil identik di mana pun.
//
// ── DUA ATURAN KEABSAHAN ────────────────────────────────────────────────────────────
// Keduanya dijaga test/tampilan.test.mjs, bukan sekadar disepakati di komentar ini.
//
//  (1) WAJAHNYA TIDAK PERNAH BERUBAH. Yang berbeda antar pose hanya sayapnya. Maskot yang
//      tersenyum saat anak benar dan murung saat anak salah adalah PENILAIAN — sementara
//      sepanjang sesi anak dijanjikan "tidak ada yang benar atau salah". Lebih buruk lagi,
//      penilaian itu datang tepat sebelum pertanyaan tentang perasaannya sendiri, yang
//      justru sedang diukur sebagai EK1.
//
//  (2) IA TIDAK MUNCUL DI LAYAR YANG MEMUAT SKALA VACS, termasuk layar latihan, dan tidak
//      muncul selama permainan berlangsung. Wajah di sebelah pertanyaan adalah petunjuk
//      jawaban; dan di Cocokkan Bentuk ia akan menjadi distraktor tambahan yang tidak
//      dirancang, mencemari justru yang diukur permainan itu.
//
// Ia karenanya hanya tampil di tiga tempat: layar login, layar pembuka tiap permainan,
// dan layar penutup.

const KULIT = '#5C7CF0';
const KULIT_TUA = '#4460D8';
const PERUT = '#FFF1DC';
const PARUH = '#F5A623';
const MATA = '#223052';

// Wajah — didefinisikan SEKALI dan dipakai apa adanya oleh setiap pose. Uji membandingkan
// keluaran ketiga pose setelah bagian sayap dibuang; keduanya harus identik.
const WAJAH = `
  <ellipse cx="47" cy="58" rx="15.5" ry="15.5" fill="#fff"/>
  <ellipse cx="73" cy="58" rx="15.5" ry="15.5" fill="#fff"/>
  <circle cx="47" cy="59" r="7" fill="${MATA}"/>
  <circle cx="73" cy="59" r="7" fill="${MATA}"/>
  <circle cx="49.8" cy="56.2" r="2.5" fill="#fff"/>
  <circle cx="75.8" cy="56.2" r="2.5" fill="#fff"/>
  <path d="M60 65 L53.5 73 L66.5 73 Z" fill="${PARUH}"/>`;

// Sayap kiri sama di semua pose; hanya sayap kanan yang berbeda.
const SAYAP_KIRI = `<ellipse cx="27" cy="76" rx="9.5" ry="19" fill="${KULIT_TUA}" transform="rotate(-12 27 76)"/>`;

const SAYAP_KANAN = {
  // Melambai — dipakai saat menyapa. Rotasi ada di <g> agar animasi CSS tidak
  // bertabrakan dengan atribut transform milik elipsnya sendiri.
  sapa:   `<g class="sayap-lambai"><ellipse cx="93" cy="62" rx="9.5" ry="19" fill="${KULIT_TUA}" transform="rotate(34 93 62)"/></g>`,
  // Menunjuk ke bawah — dipakai saat ada yang perlu dibaca di bawahnya.
  tunjuk: `<ellipse cx="94" cy="82" rx="9" ry="18" fill="${KULIT_TUA}" transform="rotate(28 94 82)"/>`,
  // Diam.
  tenang: `<ellipse cx="93" cy="76" rx="9.5" ry="19" fill="${KULIT_TUA}" transform="rotate(12 93 76)"/>`,
};

export const POSE = Object.keys(SAYAP_KANAN);

/**
 * @param {'sapa'|'tunjuk'|'tenang'} pose
 * @param {number} ukuran  panjang sisi dalam piksel
 * @returns {string} markup SVG
 *
 * aria-hidden: teksnya selalu ada di sebelahnya, dan menyebut "burung hantu" sebelum
 * setiap kalimat justru menambah beban bagi anak yang memakai pembaca layar.
 */
export function maskot(pose = 'tenang', ukuran = 92) {
  const sayap = SAYAP_KANAN[pose] ?? SAYAP_KANAN.tenang;
  return `<svg class="maskot" width="${ukuran}" height="${ukuran}" viewBox="0 0 120 120"
               aria-hidden="true" focusable="false">
    <ellipse cx="60" cy="112" rx="30" ry="5" fill="rgba(34,48,82,.10)"/>
    <path d="M38 42 L31 23 L50 35 Z" fill="${KULIT_TUA}"/>
    <path d="M82 42 L89 23 L70 35 Z" fill="${KULIT_TUA}"/>
    <path d="M50 104 h6 v6 h-6 z M64 104 h6 v6 h-6 z" fill="${PARUH}"/>
    ${SAYAP_KIRI}
    ${sayap}
    <ellipse cx="60" cy="70" rx="36" ry="38" fill="${KULIT}"/>
    <ellipse cx="60" cy="81" rx="23" ry="26" fill="${PERUT}"/>
    ${WAJAH}
  </svg>`;
}

/**
 * Puti di sebelah kalimatnya. Kalimat itu HTML — pemanggil yang melolosinya.
 * `tegak` menumpuknya ke bawah; dipakai bila Puti digambar besar, karena berdampingan
 * ia menyisakan gelembung terlalu sempit untuk kalimat sepanjang itu.
 */
export function sapaan(pose, isiHtml, ukuran = 86, { tegak = false } = {}) {
  return `<div class="sapa${tegak ? ' tegak' : ''}">
    ${maskot(pose, ukuran)}
    <div class="gelembung">${isiHtml}</div>
  </div>`;
}

/** Dipakai uji: bagian yang harus identik di semua pose. */
export const WAJAH_BAKU = WAJAH;
