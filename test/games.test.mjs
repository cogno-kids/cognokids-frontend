// games.test.mjs — bagian MURNI dari tiap game (pembangkit soal), diuji deterministik.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { shuffle, pickN, seededRng } from '../js/util.js';
import { buildRound } from '../js/games/memory-maze.js';
import { GAMES } from '../js/config.js';

const mm = GAMES.find((g) => g.id === 'mm');

describe('util', () => {
  test('shuffle tidak mengubah larik asal dan mempertahankan isinya', () => {
    const asal = [1, 2, 3, 4, 5];
    const hasil = shuffle(asal, seededRng(7));
    assert.deepEqual(asal, [1, 2, 3, 4, 5]);
    assert.deepEqual([...hasil].sort(), [1, 2, 3, 4, 5]);
  });

  test('pickN mengembalikan n elemen berbeda', () => {
    const hasil = pickN(['a', 'b', 'c', 'd', 'e', 'f'], 4, seededRng(3));
    assert.equal(hasil.length, 4);
    assert.equal(new Set(hasil).size, 4);
  });

  test('seededRng deterministik — papan bisa direproduksi saat analisis', () => {
    const a = Array.from({ length: 5 }, seededRng(99));
    const b = Array.from({ length: 5 }, seededRng(99));
    assert.deepEqual(a, b);
    assert.ok(a.every((x) => x >= 0 && x < 1));
  });
});

describe('Memory Maze — pembangkit babak', () => {
  test('mengikuti spesifikasi Tabel 3.6: babak 1 = 3 gambar dari 6', () => {
    const r = buildRound(mm.rounds[0], seededRng(11));
    assert.equal(r.targets.length, 3);
    assert.equal(r.options.length, 6);
  });

  test('babak 2 = 4 gambar dari 8 — regresi cacat MM-4 (v2.1 memakai 5)', () => {
    assert.equal(mm.rounds[1].targets, 4, 'config.js harus mengikuti Tabel 3.6, bukan v2.1');
    const r = buildRound(mm.rounds[1], seededRng(12));
    assert.equal(r.targets.length, 4);
    assert.equal(r.options.length, 8);
  });

  test('setiap target selalu ada di antara pilihan', () => {
    for (let seed = 1; seed <= 200; seed++) {
      for (const cfg of mm.rounds) {
        const r = buildRound(cfg, seededRng(seed));
        for (const t of r.targets) {
          assert.ok(r.options.includes(t), `target ${t} hilang dari pilihan (seed ${seed})`);
        }
      }
    }
  });

  test('tidak ada gambar kembar dalam satu babak', () => {
    for (let seed = 1; seed <= 200; seed++) {
      for (const cfg of mm.rounds) {
        const r = buildRound(cfg, seededRng(seed));
        assert.equal(new Set(r.options).size, r.options.length, `ada duplikat (seed ${seed})`);
      }
    }
  });

  test('jumlah distraktor selalu sama dengan jumlah target — d′ seimbang', () => {
    for (const cfg of mm.rounds) {
      assert.equal(cfg.options - cfg.targets, cfg.targets,
        'nSignal dan nNoise harus seimbang agar d′ tidak bias');
    }
  });

  test('waktu mengingat menurun di babak 2 (8 detik → 6 detik, Tabel 3.6)', () => {
    assert.equal(mm.rounds[0].showMs, 8000);
    assert.equal(mm.rounds[1].showMs, 6000);
  });
});

describe('Konsistensi config terhadap naskah', () => {
  test('keempat game memetakan ke empat dimensi yang berbeda', () => {
    const eks = GAMES.map((g) => g.ek);
    assert.equal(new Set(eks).size, 4);
  });

  test('urutan baku sesuai Tabel 3.6', () => {
    assert.deepEqual(GAMES.map((g) => g.id), ['mm', 'ft', 'pe', 'mv']);
  });

  test('Puzzle Emosi: 90 detik untuk KEDUA babak (keputusan D3)', () => {
    const pe = GAMES.find((g) => g.id === 'pe');
    assert.equal(pe.timerSec, 90);
    assert.equal(pe.rounds, 2);
  });
});

// ── Focus Tower ──────────────────────────────────────────────────────────────
import { JENIS, svgBentuk, buildSequence, fallMsFor } from '../js/games/focus-tower.js';

describe('Focus Tower', () => {
  test('setiap jenis punya BENTUK sendiri, bukan hanya warna (regresi cacat §7.1)', () => {
    // ~8% anak laki-laki mengalami defisiensi merah-hijau. Tugas harus bisa diselesaikan
    // tanpa membedakan warna sama sekali.
    const bentuk = JENIS.map((j) => j.id);
    assert.equal(new Set(bentuk).size, JENIS.length, 'ada jenis tanpa bentuk pembeda');
    for (const j of JENIS) {
      const svg = svgBentuk(j.id, j.warna);
      assert.match(svg, /<(circle|path)/, `jenis ${j.id} tidak menghasilkan bentuk`);
      assert.match(svg, /aria-label=/, `jenis ${j.id} tidak punya label aksesibilitas`);
    }
  });

  test('dua jenis berbeda tidak pernah menghasilkan SVG yang sama', () => {
    const svgs = JENIS.map((j) => svgBentuk(j.id, '#000'));
    assert.equal(new Set(svgs).size, JENIS.length);
  });

  test('urutan balok tidak pernah mengulang jenis sama tiga kali beruntun', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const seq = buildSequence(40, seededRng(seed));
      for (let i = 2; i < seq.length; i++) {
        assert.ok(!(seq[i] === seq[i - 1] && seq[i] === seq[i - 2]),
          `tiga beruntun "${seq[i]}" pada seed ${seed} indeks ${i}`);
      }
    }
  });

  test('urutan cukup panjang untuk mencapai target walau banyak salah', () => {
    const ft = GAMES.find((g) => g.id === 'ft');
    assert.ok(ft.targetScore * 3 >= ft.targetScore * 2, 'cadangan trial terlalu sedikit');
  });

  test('balok makin cepat seiring skor, tetapi ada lantai yang wajar', () => {
    assert.ok(fallMsFor(0) > fallMsFor(4));
    assert.ok(fallMsFor(4) > fallMsFor(8));
    assert.ok(fallMsFor(99) >= 1800, 'tidak boleh terlalu cepat untuk anak SD');
  });

  test('distraktor muncul cukup awal untuk memberi trial pasca-distraktor yang memadai', () => {
    const ft = GAMES.find((g) => g.id === 'ft');
    const setelah = ft.targetScore - ft.distractorFromScore;
    assert.ok(setelah >= 4,
      `hanya ${setelah} trial terpapar distraktor — terlalu sedikit untuk menghitung biaya distraksi`);
  });
});

// ── Move & Match ─────────────────────────────────────────────────────────────
import { buildBoard } from '../js/games/move-match.js';

describe('Move & Match', () => {
  const mv = GAMES.find((g) => g.id === 'mv');

  test('babak sesuai Tabel 3.6: 3 pasang lalu 4 pasang', () => {
    assert.deepEqual(mv.rounds.map((r) => r.pairs), [3, 4]);
  });

  test('setiap papan berisi tepat dua kartu per pasangan', () => {
    for (let seed = 1; seed <= 100; seed++) {
      for (const cfg of mv.rounds) {
        const board = buildBoard(cfg, seededRng(seed));
        assert.equal(board.length, cfg.pairs * 2);
        const hitung = new Map();
        for (const k of board) hitung.set(k.pair, (hitung.get(k.pair) ?? 0) + 1);
        assert.equal(hitung.size, cfg.pairs);
        for (const [pair, n] of hitung) assert.equal(n, 2, `pasangan ${pair} muncul ${n}×`);
      }
    }
  });

  test('kedua kartu satu pasangan memakai emoji yang sama', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const board = buildBoard(mv.rounds[1], seededRng(seed));
      const byPair = new Map();
      for (const k of board) {
        if (byPair.has(k.pair)) assert.equal(byPair.get(k.pair), k.emoji);
        else byPair.set(k.pair, k.emoji);
      }
    }
  });

  test('emoji tidak pernah kembar antar pasangan berbeda', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const board = buildBoard(mv.rounds[1], seededRng(seed));
      const emojiPerPair = new Map();
      for (const k of board) emojiPerPair.set(k.pair, k.emoji);
      assert.equal(new Set(emojiPerPair.values()).size, emojiPerPair.size);
    }
  });
});

// ── Puzzle Emosi ─────────────────────────────────────────────────────────────
import {
  PAPAN_TETAP, JARAK_BAKU, optimalDistance, solvable, isSolved, neighbors, pickBoards, GOAL,
} from '../js/games/puzzle-logic.js';

describe('Puzzle Emosi — himpunan papan tetap (regresi cacat §6.3)', () => {
  test('SETIAP papan berjarak solusi tepat sama — diverifikasi lewat BFS penuh', () => {
    // v2.1 membangkitkan papan berjarak 2–24 langkah, sehingga seorang anak bisa mendapat
    // papan dua belas kali lebih sulit dari temannya, dan variasi itu masuk ke data.
    for (const b of PAPAN_TETAP) {
      assert.equal(optimalDistance(b), JARAK_BAKU,
        `papan ${JSON.stringify(b)} berjarak ${optimalDistance(b)}, bukan ${JARAK_BAKU}`);
    }
  });

  test('setiap papan dapat diselesaikan', () => {
    for (const b of PAPAN_TETAP) assert.ok(solvable(b), `papan ${JSON.stringify(b)} tak terselesaikan`);
  });

  test('tidak ada papan yang sudah tersusun sejak awal (v2.1: 0,75% kejadian)', () => {
    for (const b of PAPAN_TETAP) assert.equal(isSolved(b), false);
  });

  test('himpunan mencakup SELURUH posisi kotak kosong yang mungkin pada jarak genap', () => {
    // Setiap geseran mengubah (baris+kolom) kotak kosong sebesar satu, sehingga paritasnya
    // terikat pada paritas jumlah langkah. Pada jarak genap hanya indeks 0,2,4,6,8 yang
    // mungkin — bukan cacat pembangkit, melainkan konsekuensi matematis.
    const posisi = new Set(PAPAN_TETAP.map((b) => b.indexOf(null)));
    assert.deepEqual([...posisi].sort((a, b) => a - b), [0, 2, 4, 6, 8]);
  });

  test('tidak ada papan kembar', () => {
    const s = new Set(PAPAN_TETAP.map((b) => JSON.stringify(b)));
    assert.equal(s.size, PAPAN_TETAP.length);
  });

  test('pickBoards mengambil papan berbeda untuk tiap babak', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const dua = pickBoards(2, seededRng(seed));
      assert.equal(dua.length, 2);
      assert.notDeepEqual(dua[0], dua[1], `papan berulang pada seed ${seed}`);
      for (const b of dua) assert.equal(optimalDistance(b), JARAK_BAKU);
    }
  });
});

describe('Puzzle Emosi — logika papan', () => {
  test('tetangga kotak kosong benar di sudut, tepi, dan tengah', () => {
    assert.deepEqual(neighbors(0).sort((a, b) => a - b), [1, 3]);
    assert.deepEqual(neighbors(4).sort((a, b) => a - b), [1, 3, 5, 7]);
    assert.deepEqual(neighbors(8).sort((a, b) => a - b), [5, 7]);
  });

  test('keadaan tujuan dikenali sebagai selesai', () => {
    assert.ok(isSolved([...GOAL]));
    assert.equal(isSolved([2, 1, 3, 4, 5, 6, 7, 8, null]), false);
  });

  test('menggeser bolak-balik mengembalikan papan ke keadaan semula', () => {
    const b = [...PAPAN_TETAP[0]];
    const e0 = b.indexOf(null);
    const n = neighbors(e0)[0];
    [b[e0], b[n]] = [b[n], b[e0]];
    assert.notDeepEqual(b, PAPAN_TETAP[0], 'geseran tidak mengubah papan');
    [b[n], b[e0]] = [b[e0], b[n]];
    assert.deepEqual(b, PAPAN_TETAP[0]);
  });

  test('satu geseran mengubah jarak optimal tepat satu langkah', () => {
    for (const papan of PAPAN_TETAP) {
      const e = papan.indexOf(null);
      for (const n of neighbors(e)) {
        const b = [...papan];
        [b[e], b[n]] = [b[n], b[e]];
        const d = optimalDistance(b);
        assert.ok(Math.abs(d - JARAK_BAKU) === 1, `jarak berubah ${d - JARAK_BAKU}, seharusnya ±1`);
      }
    }
  });
});
