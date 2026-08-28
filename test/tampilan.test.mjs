// tampilan.test.mjs — penjaga rombakan rupa v3.9.
//
// Dua hal yang diuji di sini, dan keduanya pernah luput dengan cara yang mahal.
//
// (1) LAYARNYA BENAR-BENAR TERANGKAI. Tidak ada satu pun uji sebelumnya yang pernah
//     MEMANGGIL fungsi render. Uji lain memeriksa berkasnya sebagai teks — apakah ada
//     label riset, apakah terdaftar di SHELL — sehingga variabel yang tidak terdefinisi
//     atau impor yang salah nama baru ketahuan di layar ponsel, di sekolah. Di sini
//     setiap layar benar-benar dirender ke DOM tiruan.
//
// (2) ATURAN KEABSAHAN RUPA. Sebuah rombakan visual bisa merusak alat ukur tanpa satu
//     baris pun kode pengukuran tersentuh: maskot yang ikut bersedih, hadiah yang hanya
//     jatuh kepada anak yang menang, label skala yang terlalu kecil untuk dibaca. Aturan
//     yang hanya ditulis di komentar akan hilang pada rombakan berikutnya. Yang di sini
//     tidak bisa.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// ── Shim: harus terpasang SEBELUM modul apa pun diimpor ──────────────────────
class MemStorage {
  #m = new Map();
  getItem(k) { return this.#m.has(k) ? this.#m.get(k) : null; }
  setItem(k, v) { this.#m.set(k, String(v)); }
  removeItem(k) { this.#m.delete(k); }
  clear() { this.#m.clear(); }
}
globalThis.localStorage = new MemStorage();
globalThis.matchMedia = () => ({ matches: false });

/** Elemen tiruan seadanya: cukup agar kode perangkaian berjalan tanpa melempar. */
class Elem {
  constructor(tag = 'div') {
    this.tagName = tag; this.dataset = {}; this.textContent = ''; this.className = '';
    this.style = { setProperty() {}, removeProperty() {} };
    this.classList = { add() {}, remove() {}, toggle() {}, contains: () => false };
    this._h = {}; this._q = new Map(); this.innerHTML = '';
  }
  addEventListener(t, fn) { (this._h[t] ??= []).push(fn); }
  // Memoisasi WAJIB: tanpa ini setiap querySelector mengembalikan elemen baru, dan uji
  // tidak akan pernah bisa memanggil penangan yang baru saja dipasang render.
  querySelector(sel) {
    if (!this._q.has(sel)) this._q.set(sel, new Elem());
    return this._q.get(sel);
  }
  querySelectorAll() { return []; }
  setAttribute() {} removeAttribute() {} getAttribute() { return null; }
  focus() {} scrollIntoView() {} remove() {} appendChild() {} animate() { return {}; }
  setPointerCapture() {}
}
const klik = (el) => (el._h.click ?? []).forEach((fn) => fn({ target: { closest: () => null } }));

// api.js memasang pendengar 'online' saat modul dimuat, dan selesai.js menariknya
// lewat layar peneliti.
globalThis.window = { addEventListener() {} };
globalThis.document = {
  createElement: (t) => new Elem(t),
  body: new Elem('body'),
  elementFromPoint: () => null,
};

const { GAMES, VACS_ITEMS, WARNA_GAME } = await import('../js/config.js');
const { Store } = await import('../js/store.js');
const { renderIntro } = await import('../js/pages/intro.js');
const { renderVACS, renderVACSTraining } = await import('../js/pages/vacs.js');
const { renderLogin, renderResume } = await import('../js/pages/login.js');
const { renderSelesai } = await import('../js/pages/selesai.js');
const { maskot, sapaan, POSE, WAJAH_BAKU } = await import('../js/components/maskot.js');
const { jejak, bilah, tema } = await import('../js/components/ui.js');
const { mountMemoryMaze } = await import('../js/games/memory-maze.js');
const { mountFocusTower } = await import('../js/games/focus-tower.js');
const { mountMoveMatch } = await import('../js/games/move-match.js');
const { mountPuzzleEmosi } = await import('../js/games/puzzle-emosi.js');

const PESERTA = { id: 'S1-001', nama: 'Rani', gender: 'P', kelas: '3', sekolah: 'SDN 1', kondisi: 'A' };
const app = () => new Elem();
const css = readFileSync(join(root, 'assets/css/styles.css'), 'utf8');

// ── Kontras ──────────────────────────────────────────────────────────────────
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
};
const kontras = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

describe('Rangka layar benar-benar terangkai', () => {
  test('layar pembuka permainan terender lengkap', () => {
    Store.reset(); Store.start(PESERTA);
    const a = app();
    renderIntro(a, { game: GAMES[0], onStart() {} });
    assert.match(a.innerHTML, /Ingat Gambar/);
    assert.match(a.innerHTML, /class="jejak"/, 'jejak bintang tidak dirender');
    assert.match(a.innerHTML, /class="maskot"/, 'maskot tidak dirender');
    assert.ok(a.innerHTML.includes(GAMES[0].warna.g), 'warna permainan tidak dipasang');
  });

  test('layar login, lanjutkan, dan penutup terender lengkap', () => {
    Store.reset();
    const a1 = app(); renderLogin(a1, { onDone() {} });
    assert.match(a1.innerHTML, /Tentang kamu/);
    assert.match(a1.innerHTML, /Diisi pendamping/);
    // Keenam kolom wajib harus tetap ada setelah panelnya dipisah dua.
    for (const id of ['f-nama', 'f-id', 'f-sekolah', 'f-kelas', 'g-gender', 'g-kondisi']) {
      assert.ok(a1.innerHTML.includes(id), `kolom ${id} hilang dari layar login`);
    }

    Store.start(PESERTA);
    const a2 = app(); renderResume(a2, { onResume() {}, onRestart() {} });
    assert.match(a2.innerHTML, /Rani/);

    const a3 = app(); renderSelesai(a3, { onNewParticipant() {} });
    assert.match(a3.innerHTML, /Terima kasih, Rani/);
  });

  test('keempat permainan terpasang tanpa melempar, dan memakai warnanya sendiri', () => {
    Store.reset(); Store.start(PESERTA);
    const mesin = {
      mm: mountMemoryMaze, ft: mountFocusTower, pe: mountPuzzleEmosi, mv: mountMoveMatch,
    };
    for (const game of GAMES) {
      const a = app();
      const bersih = mesin[game.id](a, { game, onTrial() {}, onFinish() {} });
      assert.ok(a.innerHTML.length > 0, `${game.id} tidak merender apa pun`);
      assert.ok(a.innerHTML.includes(game.warna.g), `${game.id} tidak memakai warnanya sendiri`);
      assert.ok(a.innerHTML.includes(game.childName), `${game.id} tidak menyebut namanya`);
      bersih?.();
    }
  });

  test('keenam pertanyaan kuesioner terender dengan label skalanya', () => {
    Store.reset(); Store.start(PESERTA);
    const a = app();
    renderVACS(a, {
      gameName: 'Ingat Gambar', gameEmoji: '🧩', gameWarna: GAMES[0].warna, onDone() {},
    });
    const item = VACS_ITEMS[0];
    assert.match(a.innerHTML, /class="vacs-opts"/);
    for (const label of item.anchors) {
      assert.ok(a.innerHTML.includes(label), `label skala "${label}" tidak dirender`);
    }
  });
});

describe('Aturan keabsahan rupa', () => {
  // Wajah di sebelah pertanyaan perasaan adalah petunjuk jawaban. Larangan ini berlaku
  // juga di layar latihan, dan itulah sebabnya latihan dipecah menjadi dua langkah.
  test('maskot TIDAK PERNAH muncul di layar yang memuat skala', () => {
    Store.reset(); Store.start(PESERTA);

    const a = app();
    renderVACS(a, { gameName: 'Ingat Gambar', gameEmoji: '🧩', gameWarna: GAMES[0].warna, onDone() {} });
    assert.ok(a.innerHTML.includes('vacs-opts'), 'prasyarat: layar ini memang memuat skala');
    assert.ok(!a.innerHTML.includes('class="maskot"'), 'maskot muncul di layar pertanyaan');

    // Langkah 1 latihan: Puti menjelaskan, dan justru TIDAK boleh ada skala di sana.
    const b = app();
    renderVACSTraining(b, { onDone() {} });
    assert.ok(b.innerHTML.includes('class="maskot"'), 'langkah penjelasan kehilangan Puti');
    assert.ok(!b.innerHTML.includes('vacs-opts'), 'skala muncul di langkah penjelasan');

    // Langkah 2: skalanya muncul, Puti pergi.
    klik(b.querySelector('#t-next'));
    assert.ok(b.innerHTML.includes('vacs-opts'), 'langkah latihan tidak menampilkan skala');
    assert.ok(!b.innerHTML.includes('class="maskot"'), 'maskot muncul di layar latihan berisi skala');
  });

  test('maskot tidak pernah muncul selama permainan berlangsung', () => {
    Store.reset(); Store.start(PESERTA);
    const mesin = { mm: mountMemoryMaze, ft: mountFocusTower, pe: mountPuzzleEmosi, mv: mountMoveMatch };
    for (const game of GAMES) {
      const a = app();
      const bersih = mesin[game.id](a, { game, onTrial() {}, onFinish() {} });
      assert.ok(!a.innerHTML.includes('class="maskot"'),
        `maskot muncul di ${game.id} — di Cocokkan Bentuk ia menjadi distraktor tak terancang`);
      bersih?.();
    }
  });

  test('wajah maskot identik di semua pose — hanya sayapnya berbeda', () => {
    // Maskot yang tersenyum saat anak benar dan murung saat anak salah adalah PENILAIAN,
    // tepat sebelum anak ditanya bagaimana perasaannya.
    for (const pose of POSE) {
      assert.ok(maskot(pose).includes(WAJAH_BAKU), `pose "${pose}" memakai wajah yang berbeda`);
    }
    assert.deepEqual(POSE, ['sapa', 'tunjuk', 'tenang'], 'pose baru ditambahkan tanpa diperiksa');
  });

  test('perayaan hanya di layar penutup, tidak pernah di dalam permainan', () => {
    // Layar penutup dicapai SETIAP anak, jadi ia tidak menyampaikan penilaian. Merayakan
    // babak yang berhasil disusun tidak begitu: anak yang kehabisan waktu akan melihat
    // perbedaannya persis sebelum ditanya apakah tadi ia main bagus dan apakah ia kesal.
    for (const f of ['js/games/puzzle-emosi.js', 'js/games/memory-maze.js',
                     'js/games/focus-tower.js', 'js/games/move-match.js']) {
      const src = readFileSync(join(root, f), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
      assert.ok(!/\bpesta\s*\(/.test(src), `${f} memanggil perayaan di dalam permainan`);
    }
    assert.match(readFileSync(join(root, 'js/pages/selesai.js'), 'utf8'), /pesta\(\)/);
  });

  test('jejak bintang memakai SVG, bukan emoji', () => {
    // Bentuk emoji ditentukan merek ponsel. Penanda kemajuan yang berbeda-beda rupa
    // antar perangkat tidak bisa dipakai anak untuk mengenali sudah sampai mana ia.
    const j = jejak(2, 4);
    assert.match(j, /<svg/);
    assert.ok(!/[⭐\u{1F31F}✨]/u.test(j), 'jejak memakai emoji bintang');
    assert.match(j, /aria-label="2 dari 4 permainan sudah selesai"/);
  });
});

describe('Warna dan keterbacaan — dihitung ulang, bukan diklaim', () => {
  test('setiap permainan punya empat bidang warna', () => {
    for (const g of GAMES) {
      assert.ok(g.warna, `${g.id} tidak punya warna`);
      for (const k of ['g', 'tua', 'terang', 'teks']) {
        assert.match(g.warna[k] ?? '', /^#[0-9A-F]{6}$/i, `${g.id}.${k} bukan warna heks`);
      }
    }
    assert.deepEqual(Object.keys(WARNA_GAME).sort(), GAMES.map((g) => g.id).sort());
  });

  test('teks di atas warna permainan lulus WCAG AA (4.5:1)', () => {
    for (const g of GAMES) {
      const w = g.warna;
      const uji = [
        [`teks di atas ${g.id}`, w.teks, w.g],
        [`${g.id} tua di atas terang`, w.tua, w.terang],
        [`${g.id} tua di atas kertas putih`, w.tua, '#FFFFFF'],
      ];
      for (const [apa, fg, bg] of uji) {
        const r = kontras(fg, bg);
        assert.ok(r >= 4.5, `${apa}: ${r.toFixed(2)}:1 — di bawah ambang AA 4.5:1`);
      }
    }
  });

  test('token tinta lulus AA di atas kertas putih', () => {
    // --tinta-3 lama (#6B7280) hanya 4.22:1 dan dipakai untuk hampir seluruh teks
    // penjelas. Penggantinya harus benar-benar lulus, bukan sekadar terlihat lebih gelap.
    for (const nama of ['tinta', 'tinta-2', 'tinta-3']) {
      const m = css.match(new RegExp(`--${nama}:\\s*(#[0-9A-Fa-f]{6})`));
      assert.ok(m, `token --${nama} tidak ditemukan`);
      const r = kontras(m[1], '#FFFFFF');
      assert.ok(r >= 4.5, `--${nama} (${m[1]}) hanya ${r.toFixed(2)}:1 di atas putih`);
    }
  });

  test('label skala kuesioner cukup besar untuk dibaca', () => {
    // Label inilah yang memberi MAKNA pada kelima emoji. Sampai v3.8 ia 11px abu pucat —
    // teks terkecil sekaligus terpucat di seluruh aplikasi. Anak yang tidak membacanya
    // menjawab berdasarkan tafsir emoji, bukan pengalamannya.
    const blok = css.match(/\.vacs-anchor\s*\{([^}]*)\}/);
    assert.ok(blok, '.vacs-anchor tidak ditemukan');
    const px = Number(blok[1].match(/font-size:\s*([\d.]+)px/)[1]);
    assert.ok(px >= 13, `label skala ${px}px — terlalu kecil untuk anak kelas 3`);
    const warna = blok[1].match(/color:\s*var\(--([\w-]+)\)/)[1];
    assert.ok(['tinta', 'tinta-2'].includes(warna),
      `label skala memakai --${warna}; harus sewarna teks bacaan, bukan warna redup`);
  });
});

describe('Font dibundel, bukan dipanggil dari jaringan', () => {
  const sw = readFileSync(join(root, 'sw.js'), 'utf8');

  test('berkas fontnya ada dan terdaftar di SHELL', () => {
    for (const f of ['assets/fonts/fredoka-latin.woff2', 'assets/fonts/nunito-latin.woff2']) {
      assert.ok(existsSync(join(root, f)), `font hilang: ${f}`);
      assert.ok(sw.includes(f), `${f} tidak ada di SHELL — rupanya berubah saat luring`);
    }
  });

  test('@font-face merujuk berkas seasal', () => {
    const src = [...css.matchAll(/@font-face\s*\{[^}]*url\(([^)]+)\)/g)].map((m) => m[1].replace(/['"]/g, ''));
    assert.equal(src.length, 2, 'jumlah @font-face berubah');
    for (const u of src) {
      assert.ok(!/^https?:/.test(u), `font dimuat dari luar: ${u}`);
      assert.ok(existsSync(join(root, 'assets/css', u)), `url() menunjuk berkas tak ada: ${u}`);
    }
  });

  test('lisensi font ikut disertakan', () => {
    // SIL OFL mengizinkan penyalinan seperti ini DENGAN SYARAT teks lisensinya menyertai.
    assert.ok(existsSync(join(root, 'assets/fonts/OFL.txt')));
  });
});
