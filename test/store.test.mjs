// store.test.mjs — gerbang penerimaan M2: sesi harus selamat dari reload.
//
// Cacat 5.1 v2.1 hanya bisa diuji dengan mensimulasikan reload: buang modul dari cache,
// impor ulang, dan pastikan keadaannya bangkit kembali dari localStorage.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Shim localStorage — harus terpasang SEBELUM store.js diimpor (ia membaca saat modul dimuat).
class MemStorage {
  #m = new Map();
  getItem(k) { return this.#m.has(k) ? this.#m.get(k) : null; }
  setItem(k, v) { this.#m.set(k, String(v)); }
  removeItem(k) { this.#m.delete(k); }
  clear() { this.#m.clear(); }
}
globalThis.localStorage = new MemStorage();

const PESERTA = { id: 'S1-003', nama: 'Anak Uji', gender: 'P', kelas: '4', sekolah: 'SDN 1', kondisi: 'B' };

/** Muat ulang store dengan cache-buster — mensimulasikan reload halaman. */
async function reload() {
  const mod = await import(`../js/store.js?v=${Math.random()}`);
  return mod.Store;
}

let Store;
beforeEach(async () => {
  localStorage.clear();
  Store = await reload();
  Store.reset();
});

describe('Sesi baru', () => {
  test('start() mengisi peserta, urutan game, dan cap waktu mulai', () => {
    Store.start(PESERTA);
    const s = Store.get();
    assert.equal(s.participant.nama, 'Anak Uji');
    assert.equal(s.participant.kondisi, 'B'); // KON-1: kondisi kini benar-benar dari login
    assert.equal(s.gameOrder.length, 4);
    assert.ok(s.startedAt);
    assert.equal(s.completedAt, null);
  });

  test('urutan game default mengikuti proposal Tabel 3.6', () => {
    Store.start(PESERTA);
    assert.deepEqual(Store.get().gameOrder, ['mm', 'ft', 'pe', 'mv']);
  });

  test('kondisi tidak pernah di-hardcode (regresi KON-1)', () => {
    for (const k of ['A', 'B', 'C']) {
      Store.start({ ...PESERTA, kondisi: k });
      assert.equal(Store.get().participant.kondisi, k);
    }
  });
});

describe('Ketahanan terhadap reload — regresi cacat 5.1', () => {
  test('sesi di tengah jalan bangkit utuh setelah reload', async () => {
    Store.start(PESERTA);
    Store.finishGame('mm', { accuracy: 66.7, hits: 2, falseAlarms: 1 });
    Store.saveVacs('mm', [2, 3, 1, 4, 3, 2]);
    Store.addTrial('mm', { round: 1, rtMs: 3200, correct: true });
    Store.advance();
    Store.setPhase('play');

    const bangkit = await reload();          // ← anak menutup tab / baterai habis / reload
    const s = bangkit.get();

    assert.equal(s.participant.nama, 'Anak Uji');
    assert.equal(s.games.mm.accuracy, 66.7);
    assert.deepEqual(s.vacs.mm, [2, 3, 1, 4, 3, 2]);
    assert.equal(s.trials.length, 1);
    assert.equal(bangkit.currentGameId(), 'ft');
    assert.equal(bangkit.phase(), 'play');
    assert.ok(bangkit.isResumable());
  });

  test('sesi yang sudah tuntas tidak ditawarkan untuk dilanjutkan', async () => {
    Store.start(PESERTA);
    Store.complete();
    const bangkit = await reload();
    assert.equal(bangkit.isResumable(), false);
    assert.ok(bangkit.get().completedAt);
  });

  test('localStorage korup tidak membuat aplikasi gagal muat', async () => {
    localStorage.setItem('cognokids_v3', '{bukan json');
    const bangkit = await reload();
    assert.equal(bangkit.get().participant, null);
    assert.equal(bangkit.get().trials.length, 0);
  });

  test('data berskema lama diabaikan, bukan dicampur', async () => {
    localStorage.setItem('cognokids_v3', JSON.stringify({ schema: 2, participant: { nama: 'Lama' } }));
    const bangkit = await reload();
    assert.equal(bangkit.get().participant, null);
  });
});

describe('Alur game', () => {
  test('advance() menghabiskan keempat game lalu mengembalikan false', () => {
    Store.start(PESERTA);
    assert.equal(Store.currentGameId(), 'mm');
    assert.equal(Store.advance(), true);   // → ft
    assert.equal(Store.advance(), true);   // → pe
    assert.equal(Store.advance(), true);   // → mv
    assert.ok(Store.isLastGame());
    assert.equal(Store.advance(), false);  // selesai
  });

  test('vacsBlocks() mengikuti urutan main, bukan urutan config', () => {
    Store.start(PESERTA);
    Store.saveVacs('pe', [1, 1, 1, 1, 1, 1]);
    Store.saveVacs('mm', [5, 5, 5, 5, 5, 5]);
    const blocks = Store.vacsBlocks();
    assert.equal(blocks.length, 2);
    assert.deepEqual(blocks[0], [5, 5, 5, 5, 5, 5]); // mm lebih dulu dalam gameOrder
  });

  test('trial tercatat dengan offset waktu relatif terhadap mulai sesi', () => {
    Store.start(PESERTA);
    Store.addTrial('ft', { rtMs: 850, correct: false, distractorPresent: true });
    const [tr] = Store.trialsOf('ft');
    assert.equal(tr.game, 'ft');
    assert.equal(tr.rtMs, 850);
    assert.equal(tr.distractorPresent, true);
    assert.ok(Number.isFinite(tr.t));
  });
});
