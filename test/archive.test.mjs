// archive.test.mjs — jaring pengaman terakhir untuk data lapangan.
//
// Skenario yang diuji di sini adalah yang paling mungkin merusak pengambilan data:
// 30 anak bergantian memakai satu ponsel, tanpa sinyal, backend belum terpasang.
// "Peserta berikutnya" memanggil Store.reset(); tanpa arsip, data anak sebelumnya lenyap.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

class MemStorage {
  #m = new Map();
  getItem(k) { return this.#m.has(k) ? this.#m.get(k) : null; }
  setItem(k, v) { this.#m.set(k, String(v)); }
  removeItem(k) { this.#m.delete(k); }
  clear() { this.#m.clear(); }
}
globalThis.localStorage = new MemStorage();

const { Archive } = await import('../js/archive.js');
const { toCsv } = await import('../js/export.js');

const sesi = (id) => ({
  entry: { sessionId: id, siswaId: id, nama: `Anak ${id}`, EK1: 60, EK2: 40, komposit: 58.2, kondisi: 'B' },
  trials: [{ sessionId: id, game: 'mm', rtMs: 4200 }, { sessionId: id, game: 'ft', rtMs: 800 }],
});

beforeEach(() => { localStorage.clear(); Archive.clear(); });

describe('Arsip perangkat', () => {
  test('menyimpan sesi berturut-turut — 30 anak satu ponsel', () => {
    for (let i = 1; i <= 30; i++) Archive.add(sesi(`S1-${String(i).padStart(3, '0')}`));
    assert.equal(Archive.count(), 30);
    assert.equal(Archive.all().at(-1).entry.siswaId, 'S1-030');
  });

  test('sessionId yang sama tidak terarsip dua kali', () => {
    // Layar penutup bisa dimuat ulang; arsip harus idempoten.
    Archive.add(sesi('A'));
    const r = Archive.add(sesi('A'));
    assert.equal(Archive.count(), 1);
    assert.equal(r.duplikat, true);
  });

  test('setiap baris membawa cap waktu arsip dan versi aplikasi', () => {
    Archive.add(sesi('A'));
    const [r] = Archive.all();
    assert.ok(r.arsipAt);
    assert.ok(r.appVersion);
  });

  test('arsip korup tidak membuat aplikasi gagal — dianggap kosong', () => {
    localStorage.setItem('cognokids_archive_v1', '{bukan array');
    assert.deepEqual(Archive.all(), []);
    assert.equal(Archive.count(), 0);
  });

  test('CSV gabungan memuat seluruh peserta dengan kolom sejajar', () => {
    for (const id of ['A', 'B', 'C']) Archive.add(sesi(id));
    const csv = toCsv(Archive.all().map((r) => r.entry));
    const lines = csv.split('\r\n');
    assert.equal(lines.length, 4);                      // header + 3 peserta
    assert.match(lines[0], /^sessionId,/);
    for (const l of lines.slice(1)) {
      assert.equal(l.split(',').length, lines[0].split(',').length);
    }
  });

  test('CSV trial menggabungkan seluruh trial semua peserta', () => {
    for (const id of ['A', 'B']) Archive.add(sesi(id));
    const rows = Archive.all().flatMap((r) => r.trials);
    assert.equal(rows.length, 4);
    const csv = toCsv(rows);
    assert.equal(csv.split('\r\n').length, 5);
  });

  test('clear() benar-benar mengosongkan', () => {
    Archive.add(sesi('A'));
    Archive.clear();
    assert.equal(Archive.count(), 0);
  });

  test('melaporkan kegagalan penyimpanan, tidak gagal diam-diam', () => {
    const asli = localStorage.setItem.bind(localStorage);
    localStorage.setItem = () => { const e = new Error('penuh'); e.name = 'QuotaExceededError'; throw e; };
    const r = Archive.add(sesi('X'));
    localStorage.setItem = asli;
    assert.equal(r.ok, false);
    assert.match(r.error, /Quota/);
  });
});
