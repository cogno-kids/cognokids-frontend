// games/puzzle-emosi.js — menyusun angka 1–8 dengan menggeser kotak.
//
// Empat cacat v2.1 yang diperbaiki:
//
//  PE-C (P1) — angka mundur tidak terbaca. Templatnya sebenarnya sudah benar (`color:#fff`);
//              biang keladinya `updPEt()`, yang SETIAP DETIK menimpa warna teks dengan
//              ekspresi yang identik dengan ekspresi warna latarnya. Angkanya terlihat
//              sepersekian detik saat render, lalu hilang di tik pertama dan tak pernah
//              kembali — kapsul hijau polos tanpa angka. Padahal ini satu-satunya game yang
//              dibatasi waktu. Di v3 warna teks TIDAK PERNAH diikat ke warna latar.
//
//  §4.4 (P1) — tombol Stress bisa ditekan tanpa batas dan tanpa jeda, dan hitungannya
//              ditampilkan kembali kepada anak ("😫 Stress! (15×)"). Menampilkan angka itu
//              mengubah indikator afektif menjadi permainan tersendiri — persis perilaku yang
//              membuat data self-report tak bermakna. Di v3: jeda 10 detik, pencacah
//              DISEMBUNYIKAN dari anak, dan cap waktu tiap penekanan disimpan agar pola
//              kelelahan sepanjang sesi bisa dianalisis.
//
//  D3        — v2.1 memberi babak 1 sebanyak 90 detik dan babak 2 sebanyak 75 detik,
//              sehingga PE_langkah antarbabak tak sebanding. Tabel 3.6 menyebut 90 detik.
//              Di v3 kedua babak 90 detik.
//
//  §7.7 (P3) — emoji bohlam pada tombol "💡 Bantuan" nyaris tak terlihat: kuning muda di atas
//              latar kuning muda.

import { escapeHtml } from '../util.js';
import { pickBoards, neighbors, isSolved, JARAK_BAKU } from './puzzle-logic.js';

export function mountPuzzleEmosi(app, { game, onTrial, onFinish }) {
  const papanBabak = pickBoards(game.rounds);
  const trials = [];
  const stressTimesMs = [];

  let ri = 0;
  let tiles = [];
  let empty = 0;
  let moves = 0;
  let hints = 0;
  let solvedCount = 0;
  let tLeft = game.timerSec;
  let tickId = null;
  let lastMoveAt = 0;
  let babakMulai = 0;
  let sesiMulai = Date.now();
  let stressTerakhir = -Infinity;
  let selesaiBabak = false;

  function mulaiBabak() {
    tiles = [...papanBabak[ri]];
    empty = tiles.indexOf(null);
    moves = 0;
    hints = 0;
    tLeft = game.timerSec;
    selesaiBabak = false;
    babakMulai = Date.now();
    lastMoveAt = Date.now();
    gambar();
    jalankanTimer();
  }

  function jalankanTimer() {
    clearInterval(tickId);
    const mulai = Date.now();
    tickId = setInterval(() => {
      if (selesaiBabak) return;
      const lewat = Math.floor((Date.now() - mulai) / 1000);
      const sisa = Math.max(0, game.timerSec - lewat);
      if (sisa !== tLeft) { tLeft = sisa; perbaruiTimer(); }
      if (sisa <= 0) { clearInterval(tickId); habisWaktu(); }
    }, 250);
  }

  function perbaruiTimer() {
    const pct = (tLeft / game.timerSec) * 100;
    const bar = app.querySelector('#pe-bar');
    const num = app.querySelector('#pe-num');
    if (bar) {
      bar.style.width = `${pct}%`;
      bar.style.background = pct < 25 ? 'var(--bad)' : pct < 50 ? 'var(--warn)' : 'var(--ok)';
    }
    if (num) {
      num.textContent = `${tLeft}s`;
      // Latar berubah mengikuti sisa waktu — TEKS TETAP PUTIH. Inilah cacat PE-C:
      // v2.1 menyetel keduanya dari ekspresi yang sama, sehingga angkanya lenyap.
      num.style.background = pct < 25 ? 'var(--bad)' : pct < 50 ? 'var(--warn)' : 'var(--ok)';
      num.style.color = '#fff';
    }
  }

  function gambar(fb = '') {
    const bisaGeser = new Set(neighbors(empty));
    app.innerHTML = `
      <div class="topbar">
        <span style="font-size:22px" aria-hidden="true">${game.emoji}</span>
        <div style="flex:1">
          <h1>${escapeHtml(game.childName)}</h1>
          <div class="sub">Babak ${ri + 1} dari ${game.rounds}</div>
        </div>
        <span class="pe-num" id="pe-num">${tLeft}s</span>
      </div>
      <div class="progress"><i id="pe-bar" style="width:100%;background:var(--ok)"></i></div>

      <div class="screen">
        <div class="card center" style="padding:12px">
          <h3>Susun angka <b style="color:var(--indigo)">1 → 8</b> berurutan!</h3>
          <p class="muted" style="font-size:13px;margin-top:3px">Geser kotak ke tempat yang kosong</p>
        </div>

        <div class="pe-wrap">
          <div class="pe-board" id="pe-board" role="group" aria-label="Papan puzzle">
            ${tiles.map((t, i) => t === null
              ? '<div class="pe-tile kosong" aria-hidden="true"></div>'
              : `<button type="button" class="pe-tile${bisaGeser.has(i) ? ' bisa' : ''}"
                         data-i="${i}" aria-label="Angka ${t}${bisaGeser.has(i) ? ', bisa digeser' : ''}">${t}</button>`).join('')}
          </div>
          <div class="pe-target" aria-hidden="true">
            <p class="muted" style="font-size:11.5px;margin-bottom:4px">Tujuan</p>
            <div class="pe-board mini">
              ${[1,2,3,4,5,6,7,8,null].map((t) =>
                `<div class="pe-tile mini${t === null ? ' kosong' : ''}">${t ?? ''}</div>`).join('')}
            </div>
          </div>
        </div>

        <div class="pe-fb" id="pe-fb">${fb}</div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <button class="btn pe-hint" id="pe-hint">💡 Bantuan</button>
          <button class="btn pe-stress" id="pe-stress">😫 Aku stres!</button>
        </div>
      </div>`;

    perbaruiTimer();
    app.querySelector('#pe-board').addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-i]');
      if (b) geser(Number(b.dataset.i));
    });
    app.querySelector('#pe-hint').addEventListener('click', bantuan);
    app.querySelector('#pe-stress').addEventListener('click', stres);
  }

  function geser(i) {
    if (selesaiBabak || !neighbors(empty).includes(i)) return;

    const now = Date.now();
    [tiles[empty], tiles[i]] = [tiles[i], tiles[empty]];
    const from = i, to = empty;
    empty = i;
    moves += 1;

    const trial = {
      round: ri + 1,
      move: moves,
      rtMs: now - lastMoveAt,   // jeda antar langkah — proksi keraguan
      from, to,
    };
    lastMoveAt = now;
    trials.push(trial);
    onTrial?.(trial);

    if (isSolved(tiles)) { solvedCount += 1; return akhirBabak('🎉 Hebat! Tersusun semua!'); }
    gambar();
  }

  function bantuan() {
    if (selesaiBabak) return;
    hints += 1;
    gambar('💡 Kotak yang bergaris tebal bisa kamu geser');
    app.querySelectorAll('.pe-tile.bisa').forEach((el) => el.classList.add('sorot'));
    setTimeout(() => app.querySelectorAll('.pe-tile.sorot').forEach((el) => el.classList.remove('sorot')), 1600);
  }

  function stres() {
    if (selesaiBabak) return;
    const now = Date.now();
    // Jeda minimum: tanpa ini, 15 penekanan beruntun tercatat semua (§4.4).
    if (now - stressTerakhir < game.stressCooldownMs) {
      const fb = app.querySelector('#pe-fb');
      if (fb) fb.textContent = '💙 Tarik napas dulu ya, pelan-pelan…';
      return;
    }
    stressTerakhir = now;
    stressTimesMs.push(now - sesiMulai);
    // Pencacahnya TIDAK ditampilkan kembali kepada anak.
    const fb = app.querySelector('#pe-fb');
    if (fb) fb.textContent = '😌 Tenang ya! Istirahat sebentar, coba lagi pelan-pelan 💙';
  }

  function habisWaktu() {
    akhirBabak('⏰ Waktu habis! Tidak apa-apa, kamu sudah berusaha keras!');
  }

  function akhirBabak(pesan) {
    if (selesaiBabak) return;
    selesaiBabak = true;
    clearInterval(tickId);
    gambar(pesan);

    setTimeout(() => {
      ri += 1;
      if (ri < game.rounds) mulaiBabak();
      else onFinish(trials, {
        optimalMoves: JARAK_BAKU * game.rounds,
        timeMs: Date.now() - sesiMulai,
        stressClicks: stressTimesMs.length,
        stressTimesMs,
        hints,
        solved: solvedCount === game.rounds,
        solvedRounds: solvedCount,
      });
    }, 2400);
  }

  mulaiBabak();
  return () => clearInterval(tickId);
}
