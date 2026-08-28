// app.js — titik masuk. Alur ditentukan sepenuhnya oleh kursor di store, bukan oleh URL:
// anak tidak boleh bisa melompat antar layar lewat tombol kembali peramban (lihat router.js).
//
// Alur satu peserta:
//   login → latihan VACS (sekali) → [intro → game → VACS] ×4 → penutup
// Setiap perpindahan dipersistensikan, sehingga reload di titik mana pun dilanjutkan
// dari tempat yang sama (cacat §5.1).

import { APP, GAMES } from './config.js';
import { Store } from './store.js';
import { Api } from './api.js';
import { Router } from './router.js';
import { buildEntry, buildTrialRows } from './export.js';
import { Archive } from './archive.js';
import { escapeHtml } from './util.js';

import { renderLogin, renderResume } from './pages/login.js';
import { renderVACS, renderVACSTraining } from './pages/vacs.js';
import { renderIntro } from './pages/intro.js';
import { renderSelesai } from './pages/selesai.js';
import { mountMemoryMaze } from './games/memory-maze.js';
import { mountFocusTower } from './games/focus-tower.js';
import { mountMoveMatch } from './games/move-match.js';
import { mountPuzzleEmosi } from './games/puzzle-emosi.js';
import {
  summarizeMemoryMaze, summarizeFocusTower, summarizeMoveMatch, summarizePuzzle,
} from './metrics.js';

// ── Service worker ───────────────────────────────────────────────────────────
// Kegagalan registrasi (mis. dibuka via file://) tidak boleh menghalangi aplikasi jalan.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('[sw] gagal daftar:', e));
  });
}

// ── Registri game ────────────────────────────────────────────────────────────
// Kontrak: mount(app, {game, onTrial, onFinish}) memanggil onFinish(trials, extra),
// lalu `summarize(trials, extra)` mengubahnya menjadi ringkasan yang disimpan & diekspor.
// `extra` menampung besaran tingkat-game yang tidak melekat pada satu trial —
// mis. jumlah sentuhan dan jarak geser (indikator Physical Demand, Tabel 2.2).
const ENGINES = {
  mm: { mount: mountMemoryMaze,  summarize: (t) => summarizeMemoryMaze(t) },
  ft: { mount: mountFocusTower,  summarize: (t) => summarizeFocusTower(t) },
  pe: { mount: mountPuzzleEmosi, summarize: (t, x) => summarizePuzzle(t, x) },
  mv: { mount: mountMoveMatch,   summarize: (t, x) => summarizeMoveMatch(t, x) },
};

let teardown = null;

function cleanup() {
  if (typeof teardown === 'function') teardown();
  teardown = null;
}

// ── Alur ─────────────────────────────────────────────────────────────────────
function next() {
  cleanup();

  if (!Store.hasParticipant()) return Router.show('login');
  if (!Store.get().vacsTrainDone) return Router.show('latihan');

  const game = Store.currentGame();
  if (!game) return finishSession();

  switch (Store.phase()) {
    case 'intro': return Router.show('intro');
    case 'play':  return Router.show('main');
    case 'vacs':  return Router.show('vacs');
    default:      return Router.show('intro');
  }
}

async function finishSession() {
  Store.complete();

  // Arsip lokal DULU, sebelum apa pun yang bisa gagal. Ini satu-satunya salinan yang tidak
  // bergantung pada jaringan maupun keberadaan backend — lihat archive.js.
  const state = Store.get();
  const arsip = Archive.add({ entry: buildEntry(state), trials: buildTrialRows(state) });
  if (!arsip.ok) console.error('[app] sesi TIDAK terarsip:', arsip.error);

  Router.show('selesai');

  // Sinkronisasi berjalan di latar; kegagalan masuk antrean dan TIDAK menandai synced.
  const res = await Api.sendSession(buildEntry(state));
  Store.markSynced(res.ok);
  if (!res.ok) console.info('[sync] diantrekan:', res.error ?? 'offline');
}

// ── Layar ────────────────────────────────────────────────────────────────────
Router.register('login', (app) => renderLogin(app, { onDone: next }));

Router.register('resume', (app) => renderResume(app, {
  onResume: next,
  onRestart: () => { Store.reset(); next(); },
}));

Router.register('latihan', (app) => renderVACSTraining(app, {
  onDone: () => { Store.markVacsTrained(); next(); },
}));

Router.register('intro', (app) => renderIntro(app, {
  game: Store.currentGame(),
  onStart: () => { Store.setPhase('play'); next(); },
}));

Router.register('main', (app) => {
  const game = Store.currentGame();
  const engine = ENGINES[game.id];

  if (!engine) return renderEngineHilang(app, game);

  teardown = engine.mount(app, {
    game,
    onTrial: (trial) => Store.addTrial(game.id, trial),
    onFinish: (trials, extra) => {
      // Snapshot langsung ditulis — inilah yang menyelamatkan sesi bila anak menutup tab.
      Store.finishGame(game.id, engine.summarize(trials, extra) ?? {});
      Store.setPhase('vacs');
      next();
    },
  });
});

Router.register('vacs', (app) => {
  const game = Store.currentGame();
  renderVACS(app, {
    gameName: game.childName,
    gameEmoji: game.emoji,
    onDone: (answers, rts) => {
      Store.saveVacs(game.id, answers);
      rts.forEach((rtMs, i) => Store.addTrial(game.id, { kind: 'vacs', item: i + 1, rtMs }));
      if (Store.advance()) next();
      else finishSession();
    },
  });
});

Router.register('selesai', (app) => renderSelesai(app, {
  onNewParticipant: () => { Store.reset(); next(); },
}));

/**
 * Penjaga: config.js menyebut game yang tidak punya engine. Ini selalu bug pemasangan.
 * SENGAJA tanpa tombol lewati — di alat ukur, melewati satu game menghasilkan data tak
 * lengkap tanpa jejak, dan pendamping di lapangan tidak punya cara tahu itu terjadi.
 * Lebih baik berhenti keras di sini daripada memulangkan sesi yang diam-diam cacat.
 */
function renderEngineHilang(app, game) {
  app.innerHTML = `
    <div class="topbar" style="background:var(--bad)">
      <span style="font-size:22px" aria-hidden="true">⚠️</span>
      <div style="flex:1"><h1>Aduh, ada yang rusak</h1></div>
    </div>
    <div class="screen">
      <div class="card center">
        <div style="font-size:46px" aria-hidden="true">🛠️</div>
        <h2 style="margin-top:8px">Permainannya tidak bisa dibuka</h2>
        <p class="muted" style="margin-top:10px">
          Bukan salahmu, ya. Panggil Bapak/Ibu dulu.
        </p>
      </div>
    </div>`;
  console.error(`[app] engine untuk game "${game.id}" tidak terdaftar di ENGINES`);
}

// ── Boot ─────────────────────────────────────────────────────────────────────
if (Store.isResumable()) Router.show('resume');
else next();

Api.flush().then(({ sent, remaining }) => {
  if (sent || remaining) console.info(`[sync] terkirim ${sent}, tersisa ${remaining}`);
});

console.info(`${APP.name} v${APP.version} (skema ${APP.schema}) · ${GAMES.length} game`);
