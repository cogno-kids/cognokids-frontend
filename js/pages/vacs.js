// pages/vacs.js — enam pertanyaan setelah tiap mini-game.
//
// Memperbaiki dua cacat v2.1:
//  §7.2 — badge nama dimensi tampil di atas setiap pertanyaan, dan badge "EK1".."EK4"
//         tampil di bilah atas. Selain membingungkan anak sembilan tahun, itu memberi
//         petunjuk tentang apa yang "seharusnya" dirasakan → demand characteristics.
//         Di v3 label riset TIDAK PERNAH menyentuh DOM layar anak.
//  §7.5 — target sentuh emoji ±48px. Untuk anak SD terlalu kecil; di sini ≥64px.
//
// Ditambah: waktu respons per item direkam. v2.1 tidak menyimpannya sama sekali.
//
// ── Rombakan rupa v3.9 ──────────────────────────────────────────────────────────────
//
// (a) LABEL SKALA. Perubahan terpenting di berkas ini ada di CSS, dan ia bukan soal
//     selera: "Tidak · Sedikit · Lumayan · Banyak · Banyak sekali" adalah satu-satunya
//     hal yang memberi makna pada kelima emoji, namun sampai v3.8 ia dirender 11px
//     berwarna abu pucat — teks terkecil sekaligus terpucat di seluruh aplikasi. Anak
//     yang tidak membacanya akan menebak dari wajah emoji saja, dan jawabannya lalu
//     mengukur tafsir emoji, bukan pengalamannya. Sekarang 13,5px, tebal, dan sewarna
//     teks bacaan.
//
// (b) MASKOT TIDAK MUNCUL DI SINI. Layar ini dan layar latihan adalah satu-satunya
//     tempat Puti dilarang hadir, termasuk di kartu penjelasan. Wajah di dekat sebuah
//     pertanyaan perasaan adalah petunjuk jawaban. Dijaga test/tampilan.test.mjs.
//
// (c) LATIHAN DIPECAH DUA LANGKAH. Sebelumnya penjelasan dan pertanyaan latihan
//     ditumpuk di satu layar, sehingga anak membaca "Nanti kami tanya sedikit" dan
//     sebuah pertanyaan sungguhan sekaligus, lalu harus menebak mana yang harus
//     dijawab. Sekarang: dijelaskan dulu, baru berlatih. Pemisahan ini juga yang
//     memungkinkan Puti menjelaskan tanpa pernah berdiri di sebelah skala.

import { VACS_ITEMS } from '../config.js';
import { escapeHtml } from '../util.js';
import { bilah, layar, titik } from '../components/ui.js';
import { sapaan } from '../components/maskot.js';

/** Lima tombol skala. Dipakai layar sungguhan maupun layar latihan. */
function skala(item, terpilih) {
  return `<div class="vacs-opts" role="radiogroup" aria-label="${escapeHtml(item.childText)}">
      ${item.emoji.map((e, i) => `
        <button type="button" class="vacs-opt" role="radio" aria-checked="${terpilih === i + 1}"
                data-v="${i + 1}" aria-label="${escapeHtml(item.anchors[i])}">
          <span class="vacs-emoji" aria-hidden="true">${e}</span>
          <span class="vacs-anchor">${escapeHtml(item.anchors[i])}</span>
        </button>`).join('')}
    </div>`;
}

/**
 * @param {HTMLElement} app
 * @param {{gameName:string, gameEmoji:string, gameWarna:Object,
 *          onDone:(answers:number[], rts:number[])=>void}} opts
 */
export function renderVACS(app, { gameName, gameEmoji, gameWarna, onDone }) {
  const answers = new Array(VACS_ITEMS.length).fill(null);
  const rts = new Array(VACS_ITEMS.length).fill(null);
  let q = 0;
  let shownAt = Date.now();

  function draw() {
    const item = VACS_ITEMS[q];
    // Judul di bilah atas sengaja BUKAN kalimat tanya. Di bawahnya sudah ada pertanyaan
    // sungguhan, dan anak yang melihat dua kalimat tanya bertumpuk tidak tahu yang mana
    // harus dijawab. Nama dimensi riset item ini juga tidak dirender — itu disengaja.
    app.innerHTML =
      bilah({
        emoji: gameEmoji,
        judul: 'Sekarang kami mau tanya',
        sub: `Setelah bermain ${gameName}`,
        warna: gameWarna,
      }) +
      layar(`
        ${titik(q, VACS_ITEMS.length)}

        <div class="card center tanya">
          <p class="kecil">Pertanyaan ${q + 1} dari ${VACS_ITEMS.length}</p>
          <h2>${escapeHtml(item.childText)}</h2>
          <p class="muted">Tidak ada yang benar atau salah. Pilih gambar yang paling cocok buat kamu 💙</p>
        </div>

        ${skala(item, answers[q])}

        ${q > 0 ? '<button class="btn btn-ghost" id="v-back">← Kembali</button>' : ''}`,
        { warna: gameWarna, kelas: 'tengah' });

    app.querySelector('.vacs-opts').addEventListener('click', (ev) => {
      const btn = ev.target.closest('button[data-v]');
      if (!btn) return;
      answers[q] = Number(btn.dataset.v);
      rts[q] = Date.now() - shownAt;
      app.querySelectorAll('.vacs-opt').forEach((b) =>
        b.setAttribute('aria-checked', String(b === btn)));
      // 260 ms terlalu cepat: anak kelas 3 yang salah tekan belum sempat melihat
      // pilihannya menyala sebelum layar berganti, sehingga salah tekan langsung
      // menjadi data. 700 ms cukup untuk melihat dan menyadari, tanpa terasa lambat
      // ketika dikalikan 24 pertanyaan.
      setTimeout(next, 700);
    });

    app.querySelector('#v-back')?.addEventListener('click', () => {
      q -= 1; shownAt = Date.now(); draw();
    });
  }

  function next() {
    if (q < VACS_ITEMS.length - 1) { q += 1; shownAt = Date.now(); draw(); }
    else onDone(answers, rts);
  }

  draw();
}

/**
 * Latihan sebelum blok pertama — dipertahankan dari v2.1, salah satu bagian yang sudah
 * bagus (pipeline §10). Jawabannya TIDAK direkam.
 *
 * Dua langkah: Puti menjelaskan, lalu anak mencoba sekali.
 */
export function renderVACSTraining(app, { onDone }) {
  const contoh = VACS_ITEMS[0];
  let langkah = 0;
  let picked = null;

  function jelaskan() {
    app.innerHTML =
      bilah({ emoji: '💡', judul: 'Sebelum mulai' }) +
      layar(`
        ${sapaan('tunjuk', `Setiap habis main, aku tanya sedikit.<br>
          Kamu tinggal pilih gambar yang paling cocok.<br>
          <b>Tidak ada yang benar atau salah.</b>`, 124, { tegak: true })}
        <button class="btn btn-primary" id="t-next">Oke, coba dulu →</button>`,
        { kelas: 'tengah' });
    app.querySelector('#t-next').addEventListener('click', () => { langkah = 1; gambar(); });
  }

  function berlatih() {
    // Pertanyaannya berbunyi "Tadi kamu ...?" padahal anak belum bermain apa pun. Tanpa
    // pembingkaian ini ia tidak punya "tadi" untuk dijawab — dan jawaban pertamanya
    // itulah yang membentuk cara ia mengisi 24 pertanyaan berikutnya.
    app.innerHTML =
      bilah({ emoji: '💡', judul: 'Latihan dulu' }) +
      layar(`
        <div class="card center tanya">
          <span class="badge badge-warn">Latihan saja</span>
          <p class="muted" style="margin-top:10px">Anggap saja kamu baru selesai main.</p>
          <h2>${escapeHtml(contoh.childText)}</h2>
        </div>

        ${skala(contoh, picked)}

        ${picked ? `
          <div class="card center rayakan">
            <p style="font-weight:800;color:var(--benar-tua);font-size:19px">Nah, seperti itu! Gampang, kan?</p>
          </div>` : ''}

        <button class="btn btn-primary" id="t-go" ${picked ? '' : 'disabled'}>
          ${picked ? 'Aku siap, ayo mulai! →' : 'Pilih satu gambar dulu'}
        </button>`,
        { kelas: 'tengah' });

    app.querySelector('.vacs-opts').addEventListener('click', (ev) => {
      const btn = ev.target.closest('button[data-v]');
      if (!btn) return;
      picked = Number(btn.dataset.v);
      berlatih();
    });
    app.querySelector('#t-go').addEventListener('click', () => { if (picked) onDone(); });
  }

  const gambar = () => (langkah === 0 ? jelaskan() : berlatih());
  gambar();
}
