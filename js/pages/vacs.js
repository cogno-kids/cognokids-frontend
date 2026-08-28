// pages/vacs.js — enam pertanyaan VACS setelah tiap mini-game.
//
// Memperbaiki dua cacat v2.1:
//  §7.2 — badge "Mental Demand → EK2" tampil di atas setiap pertanyaan, dan badge
//         "EK1".."EK4" tampil di bilah atas. Selain membingungkan anak sembilan tahun,
//         itu memberi petunjuk tentang apa yang "seharusnya" dirasakan → demand
//         characteristics. Di v3 label riset TIDAK PERNAH menyentuh DOM layar anak.
//  §7.5 — target sentuh emoji ±48px. Untuk anak SD terlalu kecil; di sini ≥64px.
//
// Ditambah: waktu respons per item direkam. v2.1 tidak menyimpannya sama sekali.

import { VACS_ITEMS } from '../config.js';

const DOT = (on, done) =>
  `<span style="width:${on ? 22 : 8}px;height:8px;border-radius:4px;transition:width .2s;
     background:${on ? 'var(--indigo)' : done ? 'var(--indigo-line)' : '#E5E7EB'}"></span>`;

/**
 * @param {HTMLElement} app
 * @param {{gameName:string, gameEmoji:string, onDone:(answers:number[], rts:number[])=>void}} opts
 */
export function renderVACS(app, { gameName, gameEmoji, onDone }) {
  const answers = new Array(VACS_ITEMS.length).fill(null);
  const rts = new Array(VACS_ITEMS.length).fill(null);
  let q = 0;
  let shownAt = Date.now();

  function draw() {
    const item = VACS_ITEMS[q];
    // Perhatikan: item.tlx dan item.ek TIDAK dirender. Itu disengaja.
    //
    // Judul di bilah atas sengaja BUKAN kalimat tanya. Di bawahnya sudah ada pertanyaan
    // sungguhan, dan anak yang melihat dua kalimat tanya bertumpuk tidak tahu yang mana
    // harus dijawab.
    app.innerHTML = `
      <div class="topbar">
        <span style="font-size:22px" aria-hidden="true">${gameEmoji}</span>
        <div style="flex:1">
          <h1>Sekarang kami mau tanya</h1>
          <div class="sub">Setelah bermain ${escapeHtml(gameName)}</div>
        </div>
      </div>
      <div class="screen">
        <div style="display:flex;gap:5px;justify-content:center;align-items:center;padding:4px 0">
          ${VACS_ITEMS.map((_, i) => DOT(i === q, i < q)).join('')}
        </div>

        <div class="card">
          <p class="muted" style="font-size:13.5px">Pertanyaan ${q + 1} dari ${VACS_ITEMS.length}</p>
          <h2 style="margin-top:6px;line-height:1.35">${escapeHtml(item.childText)}</h2>
          <p class="muted" style="margin-top:10px;font-size:14.5px">
            Tidak ada yang benar atau salah. Pilih gambar yang paling cocok buat kamu 💙
          </p>
        </div>

        <div class="vacs-opts" role="radiogroup" aria-label="${escapeHtml(item.childText)}">
          ${item.emoji.map((e, i) => `
            <button type="button" class="vacs-opt" role="radio" aria-checked="${answers[q] === i + 1}"
                    data-v="${i + 1}" aria-label="${escapeHtml(item.anchors[i])}">
              <span class="vacs-emoji" aria-hidden="true">${e}</span>
              <span class="vacs-anchor">${escapeHtml(item.anchors[i])}</span>
            </button>`).join('')}
        </div>

        ${q > 0 ? '<button class="btn btn-ghost" id="v-back">← Kembali</button>' : ''}
      </div>`;

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
 * Layar latihan sebelum blok VACS pertama — dipertahankan dari v2.1, salah satu bagian
 * yang sudah bagus (pipeline §10). Jawabannya TIDAK direkam.
 */
export function renderVACSTraining(app, { onDone }) {
  const contoh = VACS_ITEMS[0];
  let picked = null;

  function draw() {
    // Teksnya berbunyi "pilih gambar", BUKAN "pilih gambar wajah": V3 memakai
    // 🪑🤏👋🤸🏃 — kursi dan orang berlari, tidak satu pun wajah. Anak yang disuruh
    // mencari wajah akan bingung ketika pertanyaan itu muncul.
    app.innerHTML = `
      <div class="topbar"><span style="font-size:22px" aria-hidden="true">💡</span><h1>Latihan dulu</h1></div>
      <div class="screen">
        <div class="card">
          <h2>Nanti kami tanya sedikit</h2>
          <p class="muted" style="margin-top:8px">
            Habis main, kami akan tanya sedikit.<br>
            Kamu tinggal pilih gambar yang paling cocok.<br>
            Tidak ada yang benar atau salah 💙
          </p>
        </div>

        <div class="card">
          <span class="badge badge-warn">Latihan saja</span>
          <h2 style="margin-top:10px;line-height:1.35">${escapeHtml(contoh.childText)}</h2>
        </div>

        <div class="vacs-opts" role="radiogroup" aria-label="${escapeHtml(contoh.childText)}">
          ${contoh.emoji.map((e, i) => `
            <button type="button" class="vacs-opt" role="radio" aria-checked="false"
                    data-v="${i + 1}" aria-label="${escapeHtml(contoh.anchors[i])}">
              <span class="vacs-emoji" aria-hidden="true">${e}</span>
              <span class="vacs-anchor">${escapeHtml(contoh.anchors[i])}</span>
            </button>`).join('')}
        </div>

        <div class="card center" id="t-fb" style="${picked ? '' : 'display:none'}">
          <p style="font-weight:600;color:var(--ok)">✅ Nah, seperti itu! Gampang, kan?</p>
        </div>

        <button class="btn btn-primary" id="t-go" ${picked ? '' : 'disabled style="opacity:.5"'}>
          Aku siap, ayo mulai! →
        </button>
      </div>`;

    app.querySelector('.vacs-opts').addEventListener('click', (ev) => {
      const btn = ev.target.closest('button[data-v]');
      if (!btn) return;
      picked = Number(btn.dataset.v);
      draw();
    });
    app.querySelector('#t-go').addEventListener('click', () => { if (picked) onDone(); });
  }

  draw();
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
