// export.js — MODUL MURNI. Membangun muatan sinkronisasi dan berkas ekspor.
//
// Cacat yang diperbaiki di sini:
//  P0 3.4 — v2.1 mengekspor lima variabel objektif, tiga di antaranya tanpa varians
//           (FT_skor selalu 8, MV_pasang selalu 7, MM_akurasi sering 100), sementara waktu
//           reaksi tiap trial dibuang. v3 mengekspor DUA berkas: sessions (lebar, satu baris
//           per anak) dan trials (panjang, satu baris per trial).
//  §5.5   — v2.1 menamai berkasnya .xls padahal isinya SpreadsheetML XML, sehingga Excel
//           memperingatkan, Google Sheets menolak, dan readxl/openpyxl gagal membacanya.
//           v3 memakai CSV UTF-8.
//  XLS-1  — himpunan kolom numerik v2.1 (`numCols`) meleset satu, sehingga "MV Salah" dan
//           seluruh 24 kolom item VACS keluar sebagai TEKS. Di CSV masalahnya hilang;
//           ujinya tetap ada agar tak kembali lewat pintu lain.
//  §5.6   — EK1a/EK1b dihitung, dikirim, tetapi tak pernah diekspor. Dihapus di v3.

import { DIMENSIONS, VACS_ITEMS, APP } from './config.js';
import { calcScores, scoresPerGame, forDisplay } from './scoring.js';

/** Baris sesi — muatan yang dikirim ke backend dan satu baris di sessions.csv. */
export function buildEntry(state) {
  const blocks = state.gameOrder.map((id) => state.vacs[id]).filter(Boolean);
  const { scores, aligned, composite, nBlocks } = calcScores(blocks);
  const perGame = scoresPerGame(state.vacs);

  return {
    schema: APP.schema,
    appVersion: state.appVersion ?? APP.version,
    sessionId: state.sessionId,

    // Identitas & konteks
    siswaId: state.participant?.id ?? '',
    nama: state.participant?.nama ?? '',
    gender: state.participant?.gender ?? '',
    kelas: state.participant?.kelas ?? '',
    sekolah: state.participant?.sekolah ?? '',
    kondisi: state.participant?.kondisi ?? '',   // KON-1: kini benar-benar dari login
    gameOrder: state.gameOrder.join('>'),

    startedAt: state.startedAt,
    completedAt: state.completedAt,
    nBlocks,

    // Skor: mentah (arah asli), selaras (tinggi = baik), dan komposit yang sudah benar
    ...Object.fromEntries(DIMENSIONS.map((d) => [d.id, forDisplay(scores[d.id])])),
    ...Object.fromEntries(DIMENSIONS.map((d) => [`${d.id}_selaras`, forDisplay(aligned[d.id])])),
    komposit: composite === null ? null : Math.round(composite * 100) / 100,

    // Per game per dimensi — bahan bukti diagnostisitas
    ...Object.fromEntries(
      Object.entries(perGame).flatMap(([gid, r]) =>
        DIMENSIONS.map((d) => [`${gid}_${d.id}`, forDisplay(r.scores[d.id])])),
    ),

    // Ringkasan objektif tiap game, diratakan menjadi kolom
    ...Object.fromEntries(
      Object.entries(state.games).flatMap(([gid, g]) =>
        Object.entries(g)
          .filter(([k]) => k !== 'finishedAt' && !Array.isArray(g[k]))
          .map(([k, v]) => [`${gid}_${k}`, typeof v === 'number' ? Math.round(v * 1000) / 1000 : v])),
    ),

    // 24 jawaban VACS mentah, satu kolom per item per game
    ...Object.fromEntries(
      state.gameOrder.flatMap((gid) =>
        VACS_ITEMS.map((it, i) => [`${gid}_${it.id}`, state.vacs[gid]?.[i] ?? null])),
    ),

    nTrials: state.trials.length,
  };
}

// ── CSV ──────────────────────────────────────────────────────────────────────
/** Pelolosan RFC 4180. Nilai null/undefined jadi sel kosong, bukan "null". */
export function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Union seluruh kunci, mempertahankan urutan kemunculan pertama. */
function unionKeys(rows) {
  const keys = [];
  const seen = new Set();
  for (const r of rows) for (const k of Object.keys(r)) if (!seen.has(k)) { seen.add(k); keys.push(k); }
  return keys;
}

export function toCsv(rows) {
  if (!rows.length) return '';
  const keys = unionKeys(rows);
  const lines = [keys.map(csvCell).join(',')];
  for (const r of rows) lines.push(keys.map((k) => csvCell(r[k])).join(','));
  return lines.join('\r\n');
}

/** Format panjang: satu baris per trial, dengan identitas sesi ikut di tiap baris. */
export function buildTrialRows(state) {
  return state.trials.map((t) => ({
    sessionId: state.sessionId,
    siswaId: state.participant?.id ?? '',
    sekolah: state.participant?.sekolah ?? '',
    kelas: state.participant?.kelas ?? '',
    kondisi: state.participant?.kondisi ?? '',
    ...t,
  }));
}

/** BOM UTF-8 di depan agar Excel di Windows membaca huruf beraksen dengan benar. */
export const withBom = (csv) => `﻿${csv}`;
