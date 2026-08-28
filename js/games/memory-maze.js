// games/memory-maze.js — mengingat lalu mengenali kembali serangkaian gambar.
//
// Cacat P0 3.3 v2.1: akurasi dihitung sebagai (benar / jumlah target), TANPA penalti untuk
// pilihan salah dan TANPA batas berapa gambar boleh dipilih. Menekan semua kotak — perilaku
// yang sangat wajar muncul pada anak kelas 3–6, entah bingung entah iseng — menghasilkan
// akurasi 100%. Kolom akurasi memori kerja karenanya tidak dapat dipercaya.
//
// Perbaikan di v3, dua lapis sekaligus:
//  (1) UI  — tombol "Selesai" baru aktif setelah TEPAT sejumlah target dipilih.
//  (2) Data — hit dan false alarm disimpan terpisah sehingga d′ bisa dihitung saat analisis,
//             terlepas dari perilaku anak di layar.
//
// Cacat MM-4: v2.1 menampilkan 5 gambar di babak 2, sedangkan Tabel 3.6 menyatakan 4.
// Jumlah di sini dibaca dari config.js, yang mengikuti naskah.

import { shuffle, pickN, escapeHtml } from '../util.js';
import { scoreMemoryRound } from '../metrics.js';

// ATURAN: hanya emoji Unicode 6.0 (2010) yang boleh dipakai sebagai stimulus MAUPUN
// sebagai titik skala VACS. Pada Android lama, emoji versi lebih baru muncul sebagai
// kotak kosong — dan kalau itu terjadi pada skala VACS, anak kehilangan justru bagian
// yang menggantikan angka.
//
// Yang sempat lolos dan sudah diperbaiki: 🤯 (11.0), 🤩 (10.0), 🤚 (9.0), 🤏 (12.0).
// TODO: ganti dengan SVG yang dibundel sendiri agar bentuknya seragam antar-perangkat.
const STIMULI = [
  '🐶', '🐱', '🐭', '🐰', '🐻', '🐼', '🐨', '🐯', '🐮', '🐷', '🐸', '🐔',
  '🍎', '🍌', '🍉', '🍇', '🍓', '🍒', '🍍', '🌽', '🍞', '🍕',
  '⚽', '🎈', '🎁', '🔔', '🔑', '💡', '📷', '🎧',
];

/** Bangun satu babak. MURNI — rng disuntikkan agar bisa diuji. */
export function buildRound({ targets, options }, rng = Math.random) {
  const chosen = pickN(STIMULI, options, rng);
  const targetItems = chosen.slice(0, targets);
  return {
    targets: targetItems,
    options: shuffle(chosen, rng),
  };
}

/**
 * @param {HTMLElement} app
 * @param {{game:Object, onTrial:Function, onFinish:Function}} opts
 */
export function mountMemoryMaze(app, { game, onTrial, onFinish }) {
  const trials = [];
  let ri = 0;
  let round = null;      // { targets, options }
  let selected = new Set();
  let pickStart = 0;
  let timerId = null;

  const cfg = () => game.rounds[ri];

  // ── Layar siap ──
  function screenReady() {
    const c = cfg();
    app.innerHTML = shell(`
      <div class="card center">
        <div style="font-size:52px" aria-hidden="true">${game.emoji}</div>
        <h2 style="margin-top:8px">Babak ${ri + 1} dari ${game.rounds.length}</h2>
        <p class="muted" style="margin-top:10px">
          Akan muncul <b>${c.targets} gambar</b>.<br>
          Gambarnya cuma muncul <b>${Math.round(c.showMs / 1000)} detik</b>!
        </p>
      </div>
      <button class="btn btn-primary" id="mm-go">Aku siap! →</button>`);
    app.querySelector('#mm-go').addEventListener('click', screenShow);
  }

  // ── Fase mengingat ──
  function screenShow() {
    const c = cfg();
    round = buildRound(c);
    let left = Math.round(c.showMs / 1000);

    const draw = () => {
      app.innerHTML = shell(`
        <div class="card center">
          <h3>Ingat gambar-gambar ini!</h3>
          <div style="margin:6px auto 0;max-width:220px">
            <div class="progress" style="margin:0"><i id="mm-bar" style="width:100%"></i></div>
          </div>
          <p class="muted" style="margin-top:8px;font-size:15px">
            <b id="mm-sec" style="color:var(--indigo);font-size:20px">${left}</b> detik lagi
          </p>
        </div>
        <div class="emoji-grid" style="--cols:${Math.min(round.targets.length, 4)}">
          ${round.targets.map((e) => `<div class="emoji-card show" aria-hidden="true">${e}</div>`).join('')}
        </div>`);
    };
    draw();

    const total = c.showMs;
    const startedAt = Date.now();
    clearInterval(timerId);
    timerId = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const bar = app.querySelector('#mm-bar');
      const sec = app.querySelector('#mm-sec');
      if (bar) bar.style.width = `${Math.max(0, 100 - (elapsed / total) * 100)}%`;
      const remaining = Math.ceil((total - elapsed) / 1000);
      if (sec && remaining !== left) { left = remaining; sec.textContent = Math.max(0, left); }
      if (elapsed >= total) { clearInterval(timerId); screenPick(); }
    }, 100);
  }

  // ── Fase memilih ──
  function screenPick() {
    const c = cfg();
    selected = new Set();
    pickStart = Date.now();

    app.innerHTML = shell(`
      <div class="card center">
        <h3>Pilih gambar yang tadi kamu ingat!</h3>
        <p class="muted" style="margin-top:6px">
          <span id="mm-count" style="color:var(--indigo);font-weight:700">Dipilih 0 dari ${c.targets} gambar</span>
        </p>
      </div>
      <div class="emoji-grid" style="--cols:4" id="mm-opts" role="group" aria-label="Pilih gambar yang tadi muncul">
        ${round.options.map((e, i) => `
          <button type="button" class="emoji-card pick" data-i="${i}" aria-pressed="false"
                  aria-label="Gambar ${i + 1}">${e}</button>`).join('')}
      </div>
      <button class="btn btn-primary" id="mm-done" disabled style="opacity:.5">Selesai</button>`);

    const doneBtn = app.querySelector('#mm-done');
    const countEl = app.querySelector('#mm-count');

    app.querySelector('#mm-opts').addEventListener('click', (ev) => {
      const btn = ev.target.closest('button[data-i]');
      if (!btn) return;
      const i = Number(btn.dataset.i);

      if (selected.has(i)) selected.delete(i);
      // INILAH perbaikan P0 3.3: tidak bisa memilih lebih dari jumlah target.
      else if (selected.size < c.targets) selected.add(i);
      else {
        // Menolak diam-diam adalah kegagalan senyap: anak menekan, tidak terjadi apa-apa,
        // dan ia akan mengira aplikasinya rusak lalu menekan lebih keras. Batasnya harus
        // terlihat, bukan sekadar berlaku.
        countEl.textContent = `Sudah ${c.targets}. Mau ganti? Ketuk lagi gambarnya.`;
        countEl.style.color = 'var(--warn)';
        btn.animate(
          [{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' },
           { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }],
          { duration: 220 },
        );
        return;
      }
      countEl.style.color = 'var(--indigo)';

      btn.setAttribute('aria-pressed', String(selected.has(i)));
      btn.classList.toggle('selected', selected.has(i));
      countEl.textContent = `Dipilih ${selected.size} dari ${c.targets} gambar`;

      const ready = selected.size === c.targets;
      doneBtn.disabled = !ready;
      doneBtn.style.opacity = ready ? '1' : '.5';
    });

    doneBtn.addEventListener('click', submit);
  }

  function submit() {
    const c = cfg();
    const rtMs = Date.now() - pickStart;
    const chosenEmoji = [...selected].map((i) => round.options[i]);

    const scored = scoreMemoryRound({
      selected: chosenEmoji,
      targets: round.targets,
      nOptions: round.options.length,
    });

    const trial = { round: ri + 1, rtMs, ...scored };
    trials.push(trial);
    onTrial?.(trial);

    screenFeedback(scored);
  }

  // ── Umpan balik ──
  function screenFeedback(scored) {
    const tset = new Set(round.targets);
    app.innerHTML = shell(`
      <div class="card center">
        <div style="font-size:44px" aria-hidden="true">${scored.falseAlarms === 0 ? '🎉' : '💪'}</div>
        <h3 style="margin-top:6px">
          ${scored.falseAlarms === 0 ? 'Semuanya benar!' : `Kamu dapat ${scored.hits} dari ${scored.nSignal}`}
        </h3>
        <p class="muted" style="margin-top:6px">Yang hijau ini tadi muncul.</p>
      </div>
      <div class="emoji-grid" style="--cols:4">
        ${round.options.map((e, i) => {
          const isTarget = tset.has(e);
          const wasPicked = selected.has(i);
          const cls = isTarget ? 'correct' : wasPicked ? 'wrong' : '';
          return `<div class="emoji-card ${cls}" aria-hidden="true">${e}</div>`;
        }).join('')}
      </div>`);

    setTimeout(() => {
      ri += 1;
      if (ri < game.rounds.length) screenReady();
      else onFinish(trials);
    }, 2200);
  }

  function shell(inner) {
    return `
      <div class="topbar">
        <span style="font-size:22px" aria-hidden="true">${game.emoji}</span>
        <div style="flex:1">
          <h1>${escapeHtml(game.childName)}</h1>
          <div class="sub">Babak ${ri + 1} dari ${game.rounds.length}</div>
        </div>
      </div>
      <div class="screen">${inner}</div>`;
  }

  screenReady();
  return () => clearInterval(timerId);   // pembersih bila layar ditinggalkan
}
