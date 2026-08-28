// export.test.mjs — gerbang M6: kolom numerik harus numerik, dan varians harus ada.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildEntry, buildTrialRows, toCsv, csvCell } from '../js/export.js';
import { VACS_ITEMS } from '../js/config.js';

const state = () => ({
  schema: 3, appVersion: '3.0.0', sessionId: 'S1-014-abc',
  participant: { id: 'S1-014', nama: 'Rani, "Ra"', gender: 'P', kelas: '4', sekolah: 'SDN <1>', kondisi: 'B' },
  gameOrder: ['mm', 'ft', 'pe', 'mv'],
  games: {
    mm: { hits: 6, falseAlarms: 1, dPrime: 1.8321, meanRtMs: 5150, finishedAt: 'x' },
    ft: { score: 7, wrongs: 1, distractionCostMs: 306.667, finishedAt: 'x' },
  },
  vacs: { mm: [1, 2, 3, 4, 5, 1], ft: [2, 2, 2, 2, 2, 2], pe: [3, 3, 3, 3, 3, 3], mv: [4, 4, 4, 4, 4, 4] },
  trials: [{ game: 'mm', t: 1200, round: 1, rtMs: 4200, hits: 3, falseAlarms: 0 }],
  startedAt: '2026-08-28T02:00:00.000Z', completedAt: '2026-08-28T02:25:00.000Z',
});

describe('Baris sesi', () => {
  test('membawa versi & skema agar data lintas-versi bisa dipisahkan', () => {
    const e = buildEntry(state());
    assert.equal(e.schema, 3);
    assert.equal(e.appVersion, '3.0.0');
  });

  test('kondisi ikut terekspor dan bukan selalu "A" (regresi KON-1)', () => {
    assert.equal(buildEntry(state()).kondisi, 'B');
  });

  test('mengekspor skor mentah, selaras, dan komposit sekaligus', () => {
    const e = buildEntry(state());
    for (const id of ['EK1', 'EK2', 'EK3', 'EK4']) {
      assert.ok(Number.isFinite(e[id]), `${id} hilang`);
      assert.ok(Number.isFinite(e[`${id}_selaras`]), `${id}_selaras hilang`);
    }
    assert.ok(Number.isFinite(e.komposit));
  });

  test('komposit sudah diselaraskan arahnya (regresi cacat P0 3.1)', () => {
    const e = buildEntry(state());
    const mentah = (e.EK1 + e.EK2 + e.EK3 + e.EK4) / 4;
    const selaras = (e.EK1_selaras + e.EK2_selaras + e.EK3_selaras + e.EK4_selaras) / 4;
    assert.ok(Math.abs(e.komposit - selaras) < 1);
    assert.ok(Math.abs(e.komposit - mentah) > 1, 'komposit tampak masih memakai rumus mentah v2.1');
  });

  test('EK1a dan EK1b tidak lagi ada (cacat §5.6)', () => {
    const e = buildEntry(state());
    assert.equal('EK1a' in e, false);
    assert.equal('EK1b' in e, false);
  });

  test('24 kolom item VACS mentah ikut terekspor', () => {
    const e = buildEntry(state());
    for (const gid of ['mm', 'ft', 'pe', 'mv']) {
      for (const it of VACS_ITEMS) assert.ok(`${gid}_${it.id}` in e, `${gid}_${it.id} hilang`);
    }
    assert.equal(e.mm_V1, 1);
    assert.equal(e.mv_V6, 4);
  });

  test('skor per game ikut, sebagai bahan bukti diagnostisitas', () => {
    const e = buildEntry(state());
    assert.ok(Number.isFinite(e.mm_EK2));
    assert.ok(Number.isFinite(e.ft_EK3));
  });

  test('waktu reaksi & biaya distraksi ikut terekspor (regresi cacat P0 3.4)', () => {
    const e = buildEntry(state());
    assert.equal(e.mm_meanRtMs, 5150);
    assert.equal(e.ft_distractionCostMs, 306.667);
    assert.ok(Number.isFinite(e.mm_dPrime));
  });

  test('urutan game tercatat, bukan diasumsikan', () => {
    assert.equal(buildEntry(state()).gameOrder, 'mm>ft>pe>mv');
  });
});

describe('CSV', () => {
  test('meloloskan koma, tanda kutip, dan kurung sudut dengan benar', () => {
    assert.equal(csvCell('Rani, "Ra"'), '"Rani, ""Ra"""');
    assert.equal(csvCell('SDN <1>'), 'SDN <1>');
    assert.equal(csvCell('baris\nbaru'), '"baris\nbaru"');
  });

  test('null menjadi sel kosong, bukan tulisan "null"', () => {
    assert.equal(csvCell(null), '');
    assert.equal(csvCell(undefined), '');
  });

  test('kolom numerik keluar TANPA tanda kutip (regresi cacat XLS-1)', () => {
    const csv = toCsv([buildEntry(state())]);
    const [head, row] = csv.split('\r\n');
    const keys = head.split(',');
    const vals = row.split(',');
    // Ambil kolom yang bertipe angka di sumbernya dan pastikan tak dikutip di CSV.
    for (const k of ['EK1', 'EK2', 'EK3', 'EK4', 'komposit', 'mm_V1', 'mv_V6', 'mm_meanRtMs']) {
      const i = keys.indexOf(k);
      assert.notEqual(i, -1, `kolom ${k} hilang dari header`);
      assert.doesNotMatch(vals[i], /^"/, `kolom ${k} keluar sebagai teks`);
      assert.ok(vals[i] === '' || Number.isFinite(Number(vals[i])), `kolom ${k} tidak terbaca sebagai angka`);
    }
  });

  test('baris dengan kunci berbeda tetap sejajar kolomnya', () => {
    const csv = toCsv([{ a: 1, b: 2 }, { a: 3, c: 4 }]);
    const lines = csv.split('\r\n');
    assert.equal(lines[0], 'a,b,c');
    assert.equal(lines[1], '1,2,');
    assert.equal(lines[2], '3,,4');
  });
});

describe('Format panjang', () => {
  test('tiap trial membawa identitas sesi agar bisa digabung saat analisis', () => {
    const rows = buildTrialRows(state());
    assert.equal(rows.length, 1);
    assert.equal(rows[0].sessionId, 'S1-014-abc');
    assert.equal(rows[0].siswaId, 'S1-014');
    assert.equal(rows[0].kondisi, 'B');
    assert.equal(rows[0].rtMs, 4200);
  });
});
