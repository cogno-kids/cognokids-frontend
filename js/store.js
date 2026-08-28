// store.js — keadaan sesi + persistensi localStorage (offline-first).
//
// Cacat 5.1 v2.1: seluruh keadaan sesi hanya hidup di memori dan baru ditulis ke
// localStorage di layar hasil. Reload, baterai habis, atau tombol kembali di tengah jalan
// menghapus seluruh data anak itu. Di lapangan — 20–30 anak bergantian memakai satu ponsel —
// itu pasti terjadi.
//
// Di v3: setiap mutasi langsung dipersistensikan, dan sesi yang belum tuntas bisa dilanjutkan.

import { APP, GAMES, COUNTERBALANCE } from './config.js';

const DEFAULT = () => ({
  schema: APP.schema,
  appVersion: APP.version,
  sessionId: null,
  participant: null,        // { id, nama, gender, kelas, sekolah, kondisi }
  gameOrder: GAMES.map((g) => g.id),
  cursor: { index: 0, phase: 'intro' },   // phase: intro | play | vacs
  vacsTrainDone: false,
  games: {},                // gameId -> ringkasan hasil objektif
  vacs: {},                 // gameId -> [6 jawaban 1..5]
  trials: [],               // format panjang, satu catatan per trial
  startedAt: null,
  completedAt: null,
  synced: false,
});

let state = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(APP.storageKey);
    if (!raw) return DEFAULT();
    const saved = JSON.parse(raw);
    // Skema lama tidak dipaksa masuk — lebih baik mulai bersih daripada mencampur bentuk data.
    if (saved.schema !== APP.schema) return DEFAULT();
    return { ...DEFAULT(), ...saved };
  } catch {
    return DEFAULT();
  }
}

function persist() {
  try {
    localStorage.setItem(APP.storageKey, JSON.stringify(state));
  } catch (e) {
    // Kuota penuh / mode privat. Jangan menghalangi anak; beri tahu pendamping lewat listener.
    console.warn('[store] gagal menyimpan:', e);
  }
  listeners.forEach((fn) => fn(state));
}

/** Latin square 4×4 — hanya dipakai bila COUNTERBALANCE dihidupkan (lihat config.js). */
function orderFor(participantId) {
  const base = GAMES.map((g) => g.id);
  if (!COUNTERBALANCE) return base;
  const n = base.length;
  const seed = String(participantId ?? '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const row = seed % n;
  return Array.from({ length: n }, (_, i) => base[(row + i) % n]);
}

export const Store = {
  get: () => state,
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  reset() { state = DEFAULT(); persist(); },

  // ── Sesi ───────────────────────────────────────────────────────────────────
  start(participant) {
    state = DEFAULT();
    state.sessionId = `${participant.id || 'anon'}-${Date.now().toString(36)}`;
    state.participant = participant;
    state.gameOrder = orderFor(participant.id);
    state.startedAt = new Date().toISOString();
    persist();
  },

  hasParticipant: () => !!state.participant?.nama,

  /** Sesi yang sudah dimulai tetapi belum tuntas — dasar tawaran "lanjutkan sesi". */
  isResumable: () => !!state.participant && !state.completedAt && state.startedAt !== null,

  complete() { state.completedAt = new Date().toISOString(); persist(); },
  markSynced(v) { state.synced = !!v; persist(); },

  // ── Kursor ─────────────────────────────────────────────────────────────────
  currentGameId: () => state.gameOrder[state.cursor.index] ?? null,
  currentGame: () => GAMES.find((g) => g.id === state.gameOrder[state.cursor.index]) ?? null,
  phase: () => state.cursor.phase,

  setPhase(phase) { state.cursor.phase = phase; persist(); },

  /** Maju ke game berikutnya. Mengembalikan false bila seluruh game sudah selesai. */
  advance() {
    state.cursor.index += 1;
    state.cursor.phase = 'intro';
    persist();
    return state.cursor.index < state.gameOrder.length;
  },

  isLastGame: () => state.cursor.index >= state.gameOrder.length - 1,
  progress: () => (state.cursor.index * 2 + (state.cursor.phase === 'vacs' ? 1 : 0)) / (state.gameOrder.length * 2),

  markVacsTrained() { state.vacsTrainDone = true; persist(); },

  // ── Data ───────────────────────────────────────────────────────────────────
  /** Dipanggil begitu satu game selesai — inilah snapshot yang menyelamatkan sesi. */
  finishGame(gameId, summary) {
    state.games[gameId] = { ...summary, finishedAt: new Date().toISOString() };
    persist();
  },

  /** Satu catatan per trial (format panjang). Inti data yang v2.1 kumpulkan lalu buang. */
  addTrial(gameId, trial) {
    state.trials.push({ game: gameId, t: Date.now() - new Date(state.startedAt).getTime(), ...trial });
    persist();
  },

  trialsOf: (gameId) => state.trials.filter((t) => t.game === gameId),

  saveVacs(gameId, answers) { state.vacs[gameId] = answers; persist(); },

  /** Blok VACS dalam urutan main peserta — masukan untuk calcScores(). */
  vacsBlocks: () => state.gameOrder.map((id) => state.vacs[id]).filter(Boolean),
  vacsByGame: () => ({ ...state.vacs }),
};
