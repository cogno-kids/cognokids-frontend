// games/move-match.js — memasangkan kartu dengan MENYERET-nya ke pasangan yang cocok.
//
// Tiga cacat v2.1 yang diperbaiki:
//
//  MV-2 (P0) — `S.mv.pairs` tidak pernah direset di `doMVRound()`, sementara targetnya reset
//              ke 4. Begitu babak 1 selesai `pairs` sudah 3, sehingga syarat `pairs===4`
//              terpenuhi hanya dengan SATU pasang di babak 2. Anak melihat papan berisi 8
//              kartu, mencocokkan satu pasang, lalu langsung dilempar ke kuesioner dengan
//              3 pasang belum tersentuh. `finMV()` menambalnya dengan `+3` sehingga
//              `MV_pasang` selalu 7 — angka kosmetik, bukan 3+4 seperti yang diduga.
//
//  §3.4 (P0) — Proposal (Tabel 2.2) mendeklarasikan data objektif game ini sebagai
//              "jumlah sentuhan & gerakan layar" — itulah operasionalisasi Physical Demand.
//              v2.1 tak pernah menghitung satu pun dari keduanya, sehingga indikator objektif
//              EK4 KOSONG dan dimensi itu bersandar sepenuhnya pada V3, item tunggal.
//              Mekanik seret di sini membuat tuntutan fisiknya nyata dan terukur.
//
//  §4.2 (P1) — badge "✅ 0 pasang" dan "❌ 0 salah" tidak pernah berubah selama babak
//              berjalan karena `updMV()` hanya memperbarui kartu. Angkanya baru menyusul saat
//              babak berganti — dan di sana justru muncul angka babak sebelumnya. Umpan balik
//              langsung adalah motivator utama pada permainan begini; di v3 badge diperbarui
//              pada setiap percobaan.
//
//  §7.4 (P2) — v2.1 memberi kartu yang baru dibalik gaya `.correct` (hijau), warna yang di
//              seluruh aplikasi berarti "benar", lalu menutupnya lagi bila ternyata tidak
//              cocok. Di v3 kartu yang sedang diseret memakai warna netral; hijau hanya
//              untuk pasangan yang benar-benar cocok.

import { pickN, shuffle, escapeHtml } from '../util.js';

// Emoji Unicode 6.0 — lihat catatan kompatibilitas di memory-maze.js.
const STIMULI = ['🐶', '🐱', '🐰', '🐻', '🐼', '🐯', '🍎', '🍌', '🍉', '🍓', '⚽', '🎈', '🎁', '🔔'];

/** Papan satu babak. MURNI — rng disuntikkan. */
export function buildBoard({ pairs }, rng = Math.random) {
  const pool = pickN(STIMULI, pairs, rng);
  return shuffle(pool.flatMap((e, i) => [
    { id: `${i}a`, emoji: e, pair: i },
    { id: `${i}b`, emoji: e, pair: i },
  ]), rng);
}

export function mountMoveMatch(app, { game, onTrial, onFinish }) {
  const trials = [];
  let ri = 0;
  let cards = [];
  let matched = new Set();
  // Sengaja dideklarasikan di sini dan DIRESET di mulaiBabak() — akar cacat MV-2.
  let pairsBabak = 0;
  let errorsBabak = 0;
  let touchCount = 0;
  let dragPx = 0;
  let attemptStart = 0;

  const cfg = () => game.rounds[ri];

  function mulaiBabak() {
    cards = buildBoard(cfg());
    matched = new Set();
    pairsBabak = 0;      // ← reset yang hilang di v2.1
    errorsBabak = 0;
    attemptStart = Date.now();
    gambar();
  }

  function gambar() {
    const c = cfg();
    app.innerHTML = `
      <div class="topbar">
        <span style="font-size:22px" aria-hidden="true">${game.emoji}</span>
        <div style="flex:1">
          <h1>${escapeHtml(game.childName)}</h1>
          <div class="sub">Babak ${ri + 1} dari ${game.rounds.length}</div>
        </div>
      </div>
      <div class="screen">
        <div class="card center">
          <h3>Geser kartu ke kartu yang sama!</h3>
          <div style="display:flex;gap:10px;justify-content:center;margin-top:8px;flex-wrap:wrap">
            <span class="badge badge-blue" id="mv-pasang">✅ ${pairsBabak} dari ${c.pairs} pasang</span>
          </div>
        </div>
        <div class="mv-grid" style="--cols:${c.pairs >= 4 ? 4 : 3}" id="mv-grid">
          ${cards.map((k) => `
            <div class="mv-card${matched.has(k.id) ? ' matched' : ''}"
                 data-id="${k.id}" data-pair="${k.pair}"
                 role="button" tabindex="0"
                 aria-label="Kartu ${k.emoji}${matched.has(k.id) ? ', sudah berpasangan' : ''}"
                 >${k.emoji}</div>`).join('')}
        </div>
        <p class="muted center" style="font-size:13.5px">Tekan kartunya, geser ke kartu yang sama 👆</p>
      </div>`;

    pasangSeret();
  }

  // Diperbarui SETIAP percobaan — cacat §4.2, di mana badge tidak pernah berubah selama
  // babak berjalan sehingga anak tidak tahu usahanya berhasil.
  //
  // Pencacah SALAH sengaja TIDAK ditampilkan. Sepanjang sesi anak diberi tahu "tidak ada
  // yang dinilai"; daftar kesalahan yang terus bertambah di depan matanya mengingkari itu,
  // dan itu persoalan yang sama dengan pencacah tombol stres v2.1 (§4.4). Jumlah salah
  // tetap dicatat untuk analisis — hanya tidak diperlihatkan kepada anak.
  function perbaruiBadge() {
    const c = cfg();
    const p = app.querySelector('#mv-pasang');
    if (p) p.textContent = `✅ ${pairsBabak} dari ${c.pairs} pasang`;
  }

  // ── Seret ──────────────────────────────────────────────────────────────────
  function pasangSeret() {
    const grid = app.querySelector('#mv-grid');
    if (!grid) return;

    let dragEl = null, ghost = null;
    let lastX = 0, lastY = 0;

    grid.addEventListener('pointerdown', (ev) => {
      const card = ev.target.closest('.mv-card:not(.matched)');
      if (!card) return;
      ev.preventDefault();

      touchCount += 1;                 // ← indikator Physical Demand #1
      dragEl = card;
      lastX = ev.clientX; lastY = ev.clientY;

      const r = card.getBoundingClientRect();
      ghost = card.cloneNode(true);
      ghost.className = 'mv-card dragging';
      Object.assign(ghost.style, {
        position: 'fixed', left: `${r.left}px`, top: `${r.top}px`,
        width: `${r.width}px`, height: `${r.height}px`,
        pointerEvents: 'none', zIndex: '999',
      });
      document.body.appendChild(ghost);
      card.classList.add('sumber');
      grid.setPointerCapture(ev.pointerId);
    });

    grid.addEventListener('pointermove', (ev) => {
      if (!dragEl || !ghost) return;
      const dx = ev.clientX - lastX, dy = ev.clientY - lastY;
      dragPx += Math.hypot(dx, dy);    // ← indikator Physical Demand #2
      lastX = ev.clientX; lastY = ev.clientY;
      ghost.style.transform = `translate(${ev.clientX - (parseFloat(ghost.style.left) + ghost.offsetWidth / 2)}px,
                                          ${ev.clientY - (parseFloat(ghost.style.top) + ghost.offsetHeight / 2)}px) scale(1.08)`;
    });

    const lepas = (ev) => {
      if (!dragEl) return;
      ghost?.remove(); ghost = null;
      dragEl.classList.remove('sumber');

      const bawah = document.elementFromPoint(ev.clientX, ev.clientY);
      const tujuan = bawah?.closest?.('.mv-card:not(.matched)');
      const asal = dragEl;
      dragEl = null;

      if (tujuan && tujuan !== asal) coba(asal, tujuan);
    };
    grid.addEventListener('pointerup', lepas);
    grid.addEventListener('pointercancel', () => { ghost?.remove(); ghost = null; dragEl?.classList.remove('sumber'); dragEl = null; });

    // Jalur papan tik / pembaca layar: pilih dua kartu berturut-turut.
    let dipilih = null;
    grid.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      const card = ev.target.closest('.mv-card:not(.matched)');
      if (!card) return;
      ev.preventDefault();
      touchCount += 1;
      if (!dipilih) { dipilih = card; card.classList.add('sumber'); return; }
      dipilih.classList.remove('sumber');
      if (dipilih !== card) coba(dipilih, card);
      dipilih = null;
    });
  }

  function coba(a, b) {
    const cocok = a.dataset.pair === b.dataset.pair;
    const rtMs = Date.now() - attemptStart;
    attemptStart = Date.now();

    const trial = { round: ri + 1, rtMs, matched: cocok, touchCountSoFar: touchCount };
    trials.push(trial);
    onTrial?.(trial);

    if (cocok) {
      pairsBabak += 1;
      matched.add(a.dataset.id); matched.add(b.dataset.id);
      // Hijau HANYA untuk pasangan yang benar-benar cocok (cacat §7.4).
      [a, b].forEach((el) => { el.classList.add('matched'); el.setAttribute('aria-label', `${el.textContent}, sudah berpasangan`); });
    } else {
      errorsBabak += 1;
      [a, b].forEach((el) => {
        el.classList.add('salah');
        setTimeout(() => el.classList.remove('salah'), 500);
      });
    }
    perbaruiBadge();

    if (pairsBabak === cfg().pairs) {
      setTimeout(() => {
        ri += 1;
        if (ri < game.rounds.length) mulaiBabak();
        else onFinish(trials, { touchCount, dragPx: Math.round(dragPx) });
      }, 800);
    }
  }

  mulaiBabak();
  return () => {};
}
