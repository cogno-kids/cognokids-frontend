// scoring.js — MODUL MURNI. Tidak menyentuh DOM, Date.now(), Math.random(), localStorage.
//
// Rumus terverifikasi dari kode tayang v2.1 dan cocok dengan proposal §3 Tabel 3.6:
//   EK1 = 100 − [(V4rev + V6)/2]   EK2 = (V1 + V5)/2   EK3 = V2   EK4 = 100 − V3
//
// Cacat P0 v2.1 yang diperbaiki di sini: komposit dihitung dari BEBAN, bukan dari skor
// tampilan, sehingga pembalikan arah EK2/EK3 tidak mungkin terlupakan. Bug hanya bisa
// kembali bila DIMENSIONS di config.js diubah secara sadar.

import { DIMENSIONS, VACS_ITEMS } from './config.js';

// Likert 1–5 → titik tengah bin selebar 20. Rentang riil 10–90, BUKAN 0–100 (keputusan D2).
export const SCALE_MIN = 10;
export const SCALE_MAX = 90;
export const e2s = (v) => (v - 1) * 20 + 10;
export const rev = (v) => 100 - e2s(v);

const ITEM_BY_ID = Object.fromEntries(VACS_ITEMS.map((it) => [it.id, it]));
const N_ITEMS = VACS_ITEMS.length;

/** Rata-rata tiap item across blok VACS (satu blok per game). */
function meanPerItem(blocks) {
  const sums = Object.fromEntries(VACS_ITEMS.map((it) => [it.id, 0]));
  for (const answers of blocks) {
    if (!Array.isArray(answers) || answers.length !== N_ITEMS) {
      throw new TypeError(`blok VACS harus berisi ${N_ITEMS} jawaban, diterima: ${JSON.stringify(answers)}`);
    }
    answers.forEach((v, i) => {
      if (!Number.isInteger(v) || v < 1 || v > 5) {
        throw new RangeError(`jawaban VACS harus bilangan bulat 1..5, diterima: ${v}`);
      }
      sums[VACS_ITEMS[i].id] += v;
    });
  }
  const out = {};
  for (const id of Object.keys(sums)) out[id] = sums[id] / blocks.length;
  return out;
}

/** Beban satu dimensi — SELALU searah (tinggi = beban berat), apa pun `direction`-nya. */
function burdenOf(dim, itemMeans) {
  const vals = dim.items.map((id) => {
    const spec = ITEM_BY_ID[id];
    return spec.reversed ? rev(itemMeans[id]) : e2s(itemMeans[id]);
  });
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/**
 * @param {number[][]} blocks satu larik berisi 6 jawaban (1..5) per game
 * @returns {{scores:Object, aligned:Object, composite:number|null, nBlocks:number}}
 *   scores    — mengikuti arah asli tiap dimensi (untuk layar peneliti & ekspor mentah)
 *   aligned   — seluruhnya "tinggi = lebih baik" (untuk analisis & komposit)
 *   composite — rata-rata aligned; null bila tidak ada blok
 */
export function calcScores(blocks) {
  if (!Array.isArray(blocks)) throw new TypeError('blocks harus larik');

  // v2.1 memakai `n = vacs.length || 1`, sehingga sesi tanpa jawaban menghasilkan skor 0
  // yang tampak sah. Data hilang harus terlihat sebagai hilang.
  if (blocks.length === 0) {
    const empty = Object.fromEntries(DIMENSIONS.map((d) => [d.id, null]));
    return { scores: empty, aligned: { ...empty }, composite: null, nBlocks: 0 };
  }

  const itemMeans = meanPerItem(blocks);
  const scores = {};
  const aligned = {};

  for (const dim of DIMENSIONS) {
    const burden = burdenOf(dim, itemMeans);
    aligned[dim.id] = 100 - burden;
    scores[dim.id] = dim.direction === 'higher_better' ? 100 - burden : burden;
  }

  const composite = DIMENSIONS.reduce((a, d) => a + aligned[d.id], 0) / DIMENSIONS.length;
  return { scores, aligned, composite, nBlocks: blocks.length };
}

/**
 * Skor per game per dimensi — untuk bukti DIAGNOSTISITAS (proposal mengutip Laurie-Rose:
 * tiap tugas seharusnya memuncak pada dimensi yang dirancang untuk dipantiknya).
 * v2.1 merata-ratakan semuanya lebih dulu sehingga bukti ini tidak bisa dibaca.
 * @param {Object} blocksByGame - { mm:[..6], ft:[..6], pe:[..6], mv:[..6] }
 */
export function scoresPerGame(blocksByGame) {
  const out = {};
  for (const [gameId, answers] of Object.entries(blocksByGame)) {
    if (!answers) continue;
    out[gameId] = calcScores([answers]);
  }
  return out;
}

/** Pembulatan hanya untuk tampilan. Simpan nilai mentah untuk analisis. */
export const forDisplay = (n) => (n === null || n === undefined ? null : Math.round(n));
