// metrics.test.mjs — gerbang penerimaan M6: lima variabel objektif harus punya varians.
//
// Uji "tekan semua pilihan" adalah regresi langsung atas cacat P0 3.3.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  mean, sd, median, probit, dPrime,
  scoreMemoryRound, summarizeMemoryMaze, summarizeFocusTower,
  summarizePuzzle, summarizeMoveMatch,
} from '../js/metrics.js';

const close = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${a} ≉ ${b}`);

describe('Statistik dasar', () => {
  test('mean, sd, median', () => {
    close(mean([1, 2, 3, 4]), 2.5);
    close(sd([2, 4, 4, 4, 5, 5, 7, 9]), 2.13808993529939, 1e-9);
    assert.equal(median([3, 1, 2]), 2);
    assert.equal(median([4, 1, 3, 2]), 2.5);
  });

  test('nilai kosong menghasilkan null, bukan 0 atau NaN', () => {
    assert.equal(mean([]), null);
    assert.equal(sd([5]), null);
    assert.equal(median([]), null);
  });
});

describe('probit', () => {
  test('nilai rujukan normal baku', () => {
    close(probit(0.5), 0, 1e-9);
    close(probit(0.975), 1.959963985, 1e-6);
    close(probit(0.025), -1.959963985, 1e-6);
    close(probit(0.95), 1.644853627, 1e-6);
  });

  test('menolak p di luar (0,1) alih-alih mengembalikan Infinity diam-diam', () => {
    assert.throws(() => probit(0), RangeError);
    assert.throws(() => probit(1), RangeError);
  });
});

describe("d′", () => {
  test('kinerja sempurna tetap terhingga berkat koreksi loglinear', () => {
    const d = dPrime({ hits: 3, falseAlarms: 0, nSignal: 3, nNoise: 3 });
    assert.ok(Number.isFinite(d) && d > 1.5);
  });

  test('menebak acak menghasilkan d′ mendekati nol', () => {
    close(dPrime({ hits: 5, falseAlarms: 5, nSignal: 10, nNoise: 10 }), 0, 1e-9);
  });

  test('lebih banyak hit dengan false alarm sama menaikkan d′', () => {
    const a = dPrime({ hits: 2, falseAlarms: 1, nSignal: 4, nNoise: 4 });
    const b = dPrime({ hits: 4, falseAlarms: 1, nSignal: 4, nNoise: 4 });
    assert.ok(b > a);
  });
});

describe('Memory Maze — regresi cacat P0 3.3', () => {
  test('menekan SEMUA pilihan tidak lagi menghasilkan akurasi sempurna yang bermakna', () => {
    // Babak 1 v2.1: 3 target dari 6 pilihan, anak menekan keenamnya.
    const r = scoreMemoryRound({ selected: [0, 1, 2, 3, 4, 5], targets: [0, 2, 4], nOptions: 6 });
    assert.equal(r.hits, 3);
    assert.equal(r.falseAlarms, 3);       // ← v2.1 tidak pernah mencatat ini
    assert.equal(r.accuracy, 100);        // akurasi mentah memang tetap 100...

    const jujur = scoreMemoryRound({ selected: [0, 2, 4], targets: [0, 2, 4], nOptions: 6 });
    const dTekanSemua = dPrime(r);
    const dJujur = dPrime(jujur);
    // ...tetapi d′ memisahkan keduanya dengan tegas.
    assert.ok(dJujur > dTekanSemua + 1, `d′ jujur ${dJujur} vs tekan-semua ${dTekanSemua}`);
  });

  test('babak sesuai spesifikasi Tabel 3.6: 3/6 lalu 4/8', () => {
    const b1 = scoreMemoryRound({ selected: [0, 1, 2], targets: [0, 1, 2], nOptions: 6 });
    const b2 = scoreMemoryRound({ selected: [1, 2, 3, 4], targets: [1, 2, 3, 5], nOptions: 8 });
    assert.equal(b1.nSignal, 3); assert.equal(b1.nNoise, 3);
    assert.equal(b2.nSignal, 4); assert.equal(b2.nNoise, 4);
    assert.equal(b2.hits, 3); assert.equal(b2.falseAlarms, 1);
  });

  test('ringkasan menggabungkan kedua babak dan menyimpan RT', () => {
    const s = summarizeMemoryMaze([
      { hits: 3, falseAlarms: 0, nSignal: 3, nNoise: 3, rtMs: 4200 },
      { hits: 3, falseAlarms: 1, nSignal: 4, nNoise: 4, rtMs: 6100 },
    ]);
    assert.equal(s.hits, 6);
    assert.equal(s.falseAlarms, 1);
    close(s.meanRtMs, 5150);
    assert.ok(Number.isFinite(s.dPrime));
  });
});

describe('Focus Tower — biaya distraksi (menggantikan FT_skor yang selalu 8)', () => {
  const trials = [
    { rtMs: 700, correct: true,  distractorPresent: false },
    { rtMs: 760, correct: true,  distractorPresent: false },
    { rtMs: 740, correct: true,  distractorPresent: false },
    { rtMs: 980, correct: true,  distractorPresent: true, distractorClicked: false },
    { rtMs: 1100, correct: false, distractorPresent: true, distractorClicked: true },
  ];

  test('memisahkan waktu reaksi sebelum dan sesudah distraktor', () => {
    const s = summarizeFocusTower(trials);
    close(s.meanRtPreMs, 733.3333333, 1e-6);
    close(s.meanRtPostMs, 1040);
    close(s.distractionCostMs, 306.6666667, 1e-6);
    assert.equal(s.nPre, 3);
    assert.equal(s.nPost, 2);
  });

  test('mencatat salah dan klik distraktor yang v2.1 buang', () => {
    const s = summarizeFocusTower(trials);
    assert.equal(s.score, 4);
    assert.equal(s.wrongs, 1);
    assert.equal(s.clicks, 5);
    assert.equal(s.distractorClicks, 1);
  });

  test('tanpa trial pasca-distraktor, biayanya null — bukan 0', () => {
    const s = summarizeFocusTower(trials.filter((t) => !t.distractorPresent));
    assert.equal(s.distractionCostMs, null);
  });
});

describe('Puzzle Emosi — efisiensi terhadap jarak solusi optimal', () => {
  test('efisiensi mengoreksi kesulitan papan (cacat 6.3)', () => {
    const moves = Array.from({ length: 20 }, (_, i) => ({ rtMs: 800 + i * 10 }));
    const s = summarizePuzzle(moves, {
      optimalMoves: 14, timeMs: 62000, stressClicks: 2, stressTimesMs: [12000, 41000], hints: 1, solved: true,
    });
    assert.equal(s.moves, 20);
    close(s.efficiency, 0.7);
    assert.ok(s.meanHesitationMs > 800);
    assert.deepEqual(s.stressTimesMs, [12000, 41000]);
  });

  test('dua anak dengan langkah sama tapi papan beda kesulitan bisa dibedakan', () => {
    const m = Array.from({ length: 20 }, () => ({ rtMs: 900 }));
    const mudah = summarizePuzzle(m, { optimalMoves: 4, timeMs: 5e4, stressClicks: 0, stressTimesMs: [], hints: 0, solved: true });
    const sulit = summarizePuzzle(m, { optimalMoves: 18, timeMs: 5e4, stressClicks: 0, stressTimesMs: [], hints: 0, solved: true });
    assert.ok(sulit.efficiency > mudah.efficiency);
  });
});

describe('Move & Match — indikator Physical Demand yang hilang di v2.1', () => {
  test('mencatat jumlah sentuhan dan jarak geser (Tabel 2.2)', () => {
    const s = summarizeMoveMatch(
      [{ matched: true, rtMs: 1800 }, { matched: false, rtMs: 2400 }, { matched: true, rtMs: 1500 }],
      { touchCount: 23, dragPx: 4120 },
    );
    assert.equal(s.pairs, 2);
    assert.equal(s.errors, 1);
    assert.equal(s.attempts, 3);
    assert.equal(s.touchCount, 23);
    assert.equal(s.dragPx, 4120);
    close(s.meanRtMs, 1900);
  });

  test('babak 2 tidak lagi berakhir setelah satu pasang (regresi cacat MV-2)', () => {
    // v2.1: S.mv.pairs tidak direset antar babak, sehingga syarat pairs===4 terpenuhi
    // hanya dengan SATU pasang di babak 2, dan finMV menambal dengan `+3` → selalu 7.
    const b1 = Array.from({ length: 3 }, () => ({ matched: true, rtMs: 1500 }));
    const b2 = Array.from({ length: 4 }, () => ({ matched: true, rtMs: 1700 }));
    const s = summarizeMoveMatch([...b1, ...b2], { touchCount: 40, dragPx: 8000 });
    assert.equal(s.pairs, 7);        // 7 pasang SUNGGUHAN, bukan 4+3 kosmetik
    assert.equal(s.attempts, 7);
  });
});

describe('Regresi cacat P0 3.4 — varians', () => {
  test('sepuluh sesi simulasi menghasilkan varians bukan-nol di semua ukuran utama', () => {
    const rnd = (seed) => { let s = seed; return () => (s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31; };
    const r = rnd(42);
    const kolom = { dPrime: [], ftCost: [], peEff: [], mvTouch: [], ftRt: [] };

    for (let i = 0; i < 10; i++) {
      const mm = summarizeMemoryMaze([
        { hits: 1 + Math.floor(r() * 3), falseAlarms: Math.floor(r() * 3), nSignal: 3, nNoise: 3, rtMs: 3000 + r() * 3000 },
        { hits: 1 + Math.floor(r() * 4), falseAlarms: Math.floor(r() * 4), nSignal: 4, nNoise: 4, rtMs: 4000 + r() * 3000 },
      ]);
      const ft = summarizeFocusTower(Array.from({ length: 8 }, (_, k) => ({
        rtMs: 600 + r() * 600, correct: r() > 0.2, distractorPresent: k >= 3, distractorClicked: r() > 0.8,
      })));
      const pe = summarizePuzzle(Array.from({ length: 10 + Math.floor(r() * 20) }, () => ({ rtMs: 700 + r() * 900 })),
        { optimalMoves: 14, timeMs: 4e4 + r() * 4e4, stressClicks: Math.floor(r() * 4), stressTimesMs: [], hints: 0, solved: true });
      const mv = summarizeMoveMatch(Array.from({ length: 7 }, () => ({ matched: r() > 0.3, rtMs: 1200 + r() * 1500 })),
        { touchCount: 20 + Math.floor(r() * 30), dragPx: 3000 + r() * 5000 });

      kolom.dPrime.push(mm.dPrime);
      kolom.ftCost.push(ft.distractionCostMs);
      kolom.ftRt.push(ft.meanRtMs);
      kolom.peEff.push(pe.efficiency);
      kolom.mvTouch.push(mv.touchCount);
    }

    for (const [nama, xs] of Object.entries(kolom)) {
      const v = sd(xs);
      assert.ok(v !== null && v > 0, `kolom ${nama} tidak punya varians (sd=${v})`);
    }
  });
});
