// scoring.test.mjs — kriteria penerimaan M1. Jalankan: node --test .plans/kriteria-penerimaan/
//
// Uji-uji ini adalah KONTRAK, bukan sekadar jaring pengaman. Uji "arah" (§ Arah komposit)
// adalah uji yang GAGAL pada v2.1 dan menjadi alasan seluruh rebuild ini.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { e2s, rev, calcScores, SCALE_MIN, SCALE_MAX } from '../js/scoring.js';
import { DIMENSIONS } from '../js/config.js';

const blocks = (answers, n = 4) => Array.from({ length: n }, () => [...answers]);

// Jawaban paling nyaman: beban/tuntutan/frustrasi terendah, performa tertinggi (V4 dibalik).
const PALING_NYAMAN = [1, 1, 1, 5, 1, 1];
const PALING_BERAT  = [5, 5, 5, 1, 5, 5];
const NETRAL        = [3, 3, 3, 3, 3, 3];

// Vektor dari sesi uji terkendali dalam laporan pemeriksaan (halaman §3.1).
const VEKTOR_LAPORAN = [1, 2, 3, 4, 5, 1];

describe('Skala', () => {
  test('e2s memetakan Likert ke titik tengah bin', () => {
    assert.deepEqual([1, 2, 3, 4, 5].map(e2s), [10, 30, 50, 70, 90]);
  });

  test('rev adalah cerminan e2s', () => {
    for (let v = 1; v <= 5; v++) assert.equal(rev(v), 100 - e2s(v));
  });
});

describe('Regresi terhadap v2.1', () => {
  // Mengunci matematika per-dimensi agar TIDAK berubah saat komposit diperbaiki.
  // Bila uji ini merah, dimensi ikut bergeser dan data lama jadi tak sebanding.
  test('vektor laporan menghasilkan 80/50/30/50 persis seperti v2.1', () => {
    const { scores } = calcScores(blocks(VEKTOR_LAPORAN));
    assert.equal(scores.EK1, 80);
    assert.equal(scores.EK2, 50);
    assert.equal(scores.EK3, 30);
    assert.equal(scores.EK4, 50);
  });

  test('komposit vektor laporan = 62,5 — bukan 52 seperti v2.1', () => {
    const { composite } = calcScores(blocks(VEKTOR_LAPORAN));
    assert.equal(composite, 62.5);
    // 52 adalah nilai keliru v2.1: (80+50+30+50)/4, tanpa membalik EK2 & EK3.
    assert.notEqual(composite, 52);
  });
});

describe('Langit-langit dan lantai', () => {
  // KOREKSI atas saran laporan §3.1. Laporan mengusulkan uji "semua jawaban paling nyaman
  // harus menghasilkan komposit 100". Uji itu akan GAGAL: karena e2s tak pernah menyentuh
  // 0 atau 100 (keputusan D2), maksimum yang mungkin adalah 90.
  test('jawaban paling nyaman menghasilkan 90, bukan 100', () => {
    const { composite, aligned } = calcScores(blocks(PALING_NYAMAN));
    assert.equal(composite, SCALE_MAX);
    for (const d of DIMENSIONS) assert.equal(aligned[d.id], SCALE_MAX);
  });

  test('jawaban paling berat menghasilkan 10, bukan 0', () => {
    const { composite } = calcScores(blocks(PALING_BERAT));
    assert.equal(composite, SCALE_MIN);
  });

  test('jawaban netral menghasilkan 50 di semua dimensi', () => {
    const { scores, composite } = calcScores(blocks(NETRAL));
    for (const d of DIMENSIONS) assert.equal(scores[d.id], 50);
    assert.equal(composite, 50);
  });
});

describe('Arah komposit — uji yang gagal pada v2.1', () => {
  test('beban belajar lebih RENDAH harus menaikkan komposit', () => {
    const bebanRendah = calcScores(blocks([1, 3, 3, 3, 1, 3])); // V1,V5 = 1
    const bebanTinggi = calcScores(blocks([5, 3, 3, 3, 5, 3])); // V1,V5 = 5
    assert.ok(
      bebanRendah.composite > bebanTinggi.composite,
      `anak yang merasa bebannya ringan justru diberi skor lebih rendah: ` +
      `${bebanRendah.composite} vs ${bebanTinggi.composite}`,
    );
  });

  test('distraksi lebih RENDAH harus menaikkan komposit', () => {
    const sepi = calcScores(blocks([3, 1, 3, 3, 3, 3])); // V2 = 1
    const ramai = calcScores(blocks([3, 5, 3, 3, 3, 3])); // V2 = 5
    assert.ok(sepi.composite > ramai.composite);
  });

  test('setiap dimensi bergerak searah dengan komposit setelah diselaraskan', () => {
    for (const d of DIMENSIONS) {
      const idx = d.items.map((it) => ['V1','V2','V3','V4','V5','V6'].indexOf(it));
      const baik = [...NETRAL], buruk = [...NETRAL];
      // Untuk item terbalik (V4) "baik" berarti nilai tinggi; selebihnya nilai rendah.
      idx.forEach((i) => { const terbalik = i === 3; baik[i] = terbalik ? 5 : 1; buruk[i] = terbalik ? 1 : 5; });
      assert.ok(
        calcScores(blocks(baik)).composite > calcScores(blocks(buruk)).composite,
        `dimensi ${d.id} bergerak berlawanan arah dengan komposit`,
      );
    }
  });
});

describe('Data hilang', () => {
  test('tanpa blok sama sekali menghasilkan null, bukan 0', () => {
    const r = calcScores([]);
    assert.equal(r.composite, null);
    for (const d of DIMENSIONS) assert.equal(r.scores[d.id], null);
    // v2.1 memakai `n = vacs.length || 1` → skor 0 yang tampak sah. Itu yang dicegah di sini.
  });

  test('blok tak lengkap tetap dihitung dari yang tersedia, dan jumlahnya dilaporkan', () => {
    const r = calcScores(blocks(NETRAL, 2));
    assert.equal(r.nBlocks, 2);
    assert.equal(r.composite, 50);
  });

  test('jawaban di luar 1..5 ditolak keras', () => {
    assert.throws(() => calcScores([[0, 3, 3, 3, 3, 3]]), RangeError);
    assert.throws(() => calcScores([[3, 3, 3, 3, 3, 6]]), RangeError);
    assert.throws(() => calcScores([[3, 3, 3, 3, 3, 2.5]]), RangeError);
    assert.throws(() => calcScores([[3, 3, 3]]), TypeError);
  });
});

describe('Properti atas seluruh ruang jawaban', () => {
  test('semua dimensi dan komposit berada di [10, 90] untuk 15.625 kombinasi', () => {
    let n = 0;
    for (let a = 1; a <= 5; a++)
    for (let b = 1; b <= 5; b++)
    for (let c = 1; c <= 5; c++)
    for (let d = 1; d <= 5; d++)
    for (let e = 1; e <= 5; e++)
    for (let f = 1; f <= 5; f++) {
      const { scores, aligned, composite } = calcScores([[a, b, c, d, e, f]]);
      for (const dim of DIMENSIONS) {
        assert.ok(scores[dim.id] >= SCALE_MIN && scores[dim.id] <= SCALE_MAX);
        assert.ok(aligned[dim.id] >= SCALE_MIN && aligned[dim.id] <= SCALE_MAX);
      }
      assert.ok(composite >= SCALE_MIN && composite <= SCALE_MAX);
      n++;
    }
    assert.equal(n, 5 ** 6);
  });

  test('komposit selalu sama dengan rata-rata skor yang diselaraskan', () => {
    for (const v of [PALING_NYAMAN, PALING_BERAT, NETRAL, VEKTOR_LAPORAN, [2, 4, 1, 3, 5, 2]]) {
      const { aligned, composite } = calcScores(blocks(v));
      const manual = DIMENSIONS.reduce((s, d) => s + aligned[d.id], 0) / DIMENSIONS.length;
      assert.equal(composite, manual);
    }
  });
});
