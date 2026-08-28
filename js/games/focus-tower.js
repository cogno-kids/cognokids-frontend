// games/focus-tower.js — menyortir balok jatuh ke wadah yang cocok, di tengah gangguan visual.
//
// Tiga cacat v2.1 yang diperbaiki:
//
//  §7.1 (P1) — warna merah/biru/hijau adalah SATU-SATUNYA pembeda. Sekitar 8% anak laki-laki
//              mengalami defisiensi penglihatan warna merah-hijau; bagi mereka tugas ini bukan
//              sulit melainkan MUSTAHIL, dan skor rendahnya akan salah dibaca sebagai defisit
//              perhatian. Di v3 tiap warna membawa BENTUK sendiri, sehingga tugas bisa
//              diselesaikan tanpa membedakan warna sama sekali.
//
//  §4.3 (P1) — baris wadah palsu digambar sebagai overlay `position:fixed` dengan koordinat
//              dihitung SEKALI dari getBoundingClientRect(). Akibatnya ia menimpa teks
//              instruksi, dan begitu halaman digulir atau perangkat diputar, posisinya
//              melenceng. Di v3 baris palsu adalah elemen biasa DALAM ALIRAN dokumen —
//              tidak bisa menimpa apa pun dan ikut bergerak sendiri saat tata letak berubah.
//
//              Selain itu di v2.1 baris palsu tampil IDENTIK dengan baris asli, sehingga yang
//              diukur menjadi "bisakah anak menebak baris mana yang asli" — tugas diskriminasi,
//              bukan ketahanan terhadap gangguan. Di v3 baris palsu jelas berbeda (buram,
//              bergaris putus, bergoyang) sehingga ia mengganggu perhatian tanpa membuat
//              tugasnya ambigu.
//
//  §3.4 (P0) — `FT_skor` selalu 8 karena game berhenti tepat saat skor mencapai 8: nol varians.
//              Waktu reaksi tiap trial dikumpulkan v2.1 lalu dibuang. Di v3 setiap trial
//              memancarkan rtMs beserta penanda apakah distraktor sedang tampil, sehingga
//              BIAYA DISTRAKSI (selisih RT sebelum vs sesudah) bisa dihitung — lihat metrics.js.

import { shuffle } from '../util.js';
import { bilah, layar } from '../components/ui.js';

// Tiap jenis membawa warna DAN bentuk. Bentuknya yang menanggung beban pembeda;
// warna hanya bonus visual. Uji regresi ada di test/games.test.mjs.
export const JENIS = [
  { id: 'bulat',    nama: 'bulat',    warna: '#EF4444' },
  { id: 'segitiga', nama: 'segitiga', warna: '#3B82F6' },
  { id: 'bintang',  nama: 'bintang',  warna: '#10B981' },
];

/** SVG inline — tanpa dependensi, tampil identik di semua perangkat (tidak seperti emoji). */
export function svgBentuk(id, warna, size = 44, { diberiLabel = true } = {}) {
  const p = {
    bulat: '<circle cx="24" cy="24" r="19"/>',
    segitiga: '<path d="M24 5 L44 40 L4 40 Z"/>',
    bintang: '<path d="M24 4 L29.6 18.4 L45 19.6 L33.2 29.6 L36.9 44 L24 36 L11.1 44 L14.8 29.6 L3 19.6 L18.4 18.4 Z"/>',
  }[id];
  // Di dalam tombol yang sudah punya aria-label sendiri, SVG-nya harus disembunyikan —
  // kalau tidak, pembaca layar menyebutkan bendanya dua kali.
  const aksesibilitas = diberiLabel
    ? `role="img" aria-label="${id}"`
    : 'aria-hidden="true"';
  return `<svg viewBox="0 0 48 48" width="${size}" height="${size}" fill="${warna}"
            ${aksesibilitas} focusable="false">${p}</svg>`;
}

/** Urutan balok. MURNI — rng disuntikkan. Tidak pernah mengulang jenis yang sama 3× beruntun. */
export function buildSequence(n, rng = Math.random) {
  const out = [];
  for (let i = 0; i < n; i++) {
    let pick;
    do {
      pick = JENIS[Math.floor(rng() * JENIS.length)].id;
    } while (out.length >= 2 && out.at(-1) === pick && out.at(-2) === pick);
    out.push(pick);
  }
  return out;
}

/** Kecepatan jatuh menurun seiring skor — tetapi tak pernah di bawah lantai yang wajar. */
export const fallMsFor = (score) => Math.max(1800, 4200 - score * 260);

export function mountFocusTower(app, { game, onTrial, onFinish }) {
  const target = game.targetScore;
  const trials = [];
  const urutan = buildSequence(target * 3);   // cukup panjang walau banyak yang salah

  let score = 0;
  let idx = 0;
  let blockAt = 0;          // kapan balok muncul — dasar perhitungan rtMs
  let jenisSekarang = null;
  let answered = false;
  let missTimer = null;
  let distraktorAktif = false;

  const distraktorTampil = () => score >= game.distractorFromScore;

  // Namanya `gambar`, bukan `layar`: `layar` sekarang milik rangka bersama di
  // components/ui.js, dan dua nama yang sama di satu berkas adalah cacat menunggu giliran.
  function gambar() {
    const wadah = shuffle(JENIS);   // posisi wadah diacak tiap balok — cegah hafalan motorik
    const fall = fallMsFor(score);
    const gaya = `--g:${game.warna.g};--g-tua:${game.warna.tua};--g-terang:${game.warna.terang}`;

    app.innerHTML = bilah({
      emoji: game.emoji,
      judul: game.childName,
      sub: `Benar ${score} dari ${target}`,
      warna: game.warna,
    }) +
      `<div class="progress" style="${gaya}"><i style="width:${(score / target) * 100}%"></i></div>` +
      layar(`
        <div class="card center ft-instruksi">
          <h3>Ketuk bentuk yang <b>SAMA</b> dengan balok!</h3>
          <p class="muted" style="margin-top:5px">Cepat ya, baloknya turun terus 👇</p>
        </div>

        <div class="ft-arena">
          <div class="ft-balok" style="--fall:${fall}ms" id="ft-balok">
            ${svgBentuk(jenisSekarang, JENIS.find((j) => j.id === jenisSekarang).warna, 66)}
          </div>
        </div>

        ${distraktorTampil() ? `
          <div class="ft-palsu" aria-hidden="true">
            ${shuffle(JENIS).slice(0, 3).map((j) => `
              <div class="ft-wadah palsu">${svgBentuk(j.id, j.warna, 34, { diberiLabel: false })}</div>`).join('')}
          </div>` : ''}

        <div class="ft-wadah-baris" id="ft-wadah" role="group" aria-label="Pilih bentuk yang sama dengan balok">
          ${wadah.map((j) => `
            <button type="button" class="ft-wadah" data-id="${j.id}" aria-label="Bentuk ${j.nama}">
              ${svgBentuk(j.id, j.warna, 44, { diberiLabel: false })}
            </button>`).join('')}
        </div>`,
        { warna: game.warna, kelas: 'ft-screen' });

    app.querySelector('#ft-wadah').addEventListener('click', (ev) => {
      const btn = ev.target.closest('button[data-id]');
      if (btn) jawab(btn.dataset.id, false);
    });

    // Ketukan pada wadah palsu DICATAT tetapi tidak berpengaruh apa pun pada permainan.
    // Ini ukuran perilaku langsung untuk distraksi: apakah perhatian anak benar-benar
    // tertarik ke gangguan itu.
    //
    // Sebelumnya CSS memberi `pointer-events: none` pada baris palsu sementara baris ini
    // memasang pendengar klik — pendengarnya tidak akan pernah menyala, dan kolom
    // `distractorClicked` selalu bernilai false tanpa ada yang menyadarinya.
    app.querySelector('.ft-palsu')?.addEventListener('click', () => { distraktorAktif = true; });
  }

  function nextBlock() {
    if (idx >= urutan.length) return selesai();
    jenisSekarang = urutan[idx++];
    answered = false;
    distraktorAktif = false;
    blockAt = Date.now();
    gambar();

    clearTimeout(missTimer);
    missTimer = setTimeout(() => jawab(null, true), fallMsFor(score));
  }

  function jawab(pilih, miss) {
    if (answered) return;
    answered = true;
    clearTimeout(missTimer);

    const benar = !miss && pilih === jenisSekarang;
    const trial = {
      index: trials.length + 1,
      rtMs: miss ? null : Date.now() - blockAt,
      correct: benar,
      miss: !!miss,
      // Penanda inilah yang memungkinkan biaya distraksi dihitung saat analisis.
      distractorPresent: distraktorTampil(),
      distractorClicked: distraktorAktif,
      target: jenisSekarang,
      chosen: pilih,
    };
    trials.push(trial);
    onTrial?.(trial);

    if (benar) score += 1;
    umpanBalik(benar, miss);
  }

  function umpanBalik(benar, miss) {
    const el = document.createElement('div');
    el.className = `ft-fb ${benar ? 'ok' : 'no'}`;
    el.textContent = benar ? 'Tepat!' : miss ? 'Terlambat!' : 'Bukan itu';
    app.querySelector('.ft-screen')?.appendChild(el);

    setTimeout(() => (score >= target ? selesai() : nextBlock()), 620);
  }

  function selesai() {
    clearTimeout(missTimer);
    onFinish(trials);
  }

  nextBlock();
  return () => clearTimeout(missTimer);
}
