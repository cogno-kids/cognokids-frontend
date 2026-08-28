// no-research-labels.test.mjs — gerbang penerimaan M2 (prinsip dua lapis).
//
// Cacat §7.2 v2.1: badge "EK1".."EK4" tampil di layar daftar game dan bilah atas tiap game,
// badge "Mental Demand → EK2" tampil di atas setiap pertanyaan VACS, dan pencacah
// "Distraksi: 0×" memberi tahu anak bahwa perilakunya sedang dihitung. Selain membingungkan
// anak sembilan tahun, penanda semacam itu memunculkan demand characteristics.
//
// Uji ini membaca sumber setiap layar yang dilihat anak, MEMBUANG KOMENTAR (karena komentar
// justru harus bebas menjelaskan cacatnya), lalu memastikan tak ada label riset yang tersisa.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Buang komentar blok dan baris, tanpa merusak string biasa. */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map((line) => {
      // Hanya buang // yang tidak berada di dalam string atau URL.
      let inS = null, esc = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (esc) { esc = false; continue; }
        if (c === '\\') { esc = true; continue; }
        if (inS) { if (c === inS) inS = null; continue; }
        if (c === '"' || c === "'" || c === '`') { inS = c; continue; }
        if (c === '/' && line[i + 1] === '/') return line.slice(0, i);
      }
      return line;
    })
    .join('\n');
}

// Dikecualikan dari pemindaian, masing-masing dengan alasannya:
//   config.js      — di situlah pemetaan label riset memang harus hidup.
//   peneliti.js    — layar peneliti; menampilkan label riset adalah tugasnya.
// Daftar ini sengaja pendek dan eksplisit. Menambah nama ke sini adalah keputusan sadar,
// bukan sesuatu yang boleh terjadi diam-diam.
const DIKECUALIKAN = new Set(['peneliti.js']);

/** Berkas yang isinya dirender ke layar anak. */
function childFacingFiles() {
  const out = [];
  for (const dir of ['js/pages', 'js/games', 'js/components']) {
    const abs = join(root, dir);
    if (!existsSync(abs)) continue;
    for (const f of readdirSync(abs)) {
      if (!f.endsWith('.js') || DIKECUALIKAN.has(f)) continue;
      out.push(join(dir, f));
    }
  }
  return out;
}

const TERLARANG = [
  { re: /\bEK[1-4]\b/, apa: 'label dimensi EK' },
  { re: /Mental Demand|Temporal Demand|Physical Demand|Frustration|NASA-?TLX/i, apa: 'nama dimensi NASA-TLX' },
  { re: /\bV[1-6]\b/, apa: 'kode item VACS' },
  { re: /\.tlx\b/, apa: 'akses field .tlx' },
  { re: /\.ek\b/, apa: 'akses field .ek' },
];

describe('Prinsip dua lapis — label riset tidak boleh sampai ke layar anak', () => {
  const files = childFacingFiles();

  test('ada berkas layar anak untuk diperiksa', () => {
    assert.ok(files.length > 0, 'tidak ada berkas di js/pages, js/games, atau js/components');
  });

  for (const rel of files) {
    test(`${rel} bersih dari label riset`, () => {
      const src = stripComments(readFileSync(join(root, rel), 'utf8'));
      for (const { re, apa } of TERLARANG) {
        const hit = src.match(re);
        assert.equal(hit, null,
          `${rel} memuat ${apa} di luar komentar: "${hit?.[0]}". ` +
          'Label riset hanya boleh hidup di config.js dan dibaca oleh ekspor / mode peneliti.');
      }
    });
  }

  test('config.js justru HARUS memuat pemetaannya — di situlah tempatnya', () => {
    const src = readFileSync(join(root, 'js/config.js'), 'utf8');
    assert.match(src, /\bEK1\b/);
    assert.match(src, /Mental Demand/);
  });

  test('layar peneliti memang menampilkan label riset — penjaga ini bermakna', () => {
    // Bila uji ini merah, artinya layar peneliti tidak lagi menampilkan apa pun yang
    // dilarang di layar anak — dan pengecualiannya jadi tak perlu.
    const src = stripComments(readFileSync(join(root, 'js/pages/peneliti.js'), 'utf8'));
    assert.match(src, /DIMENSIONS/);
  });
});
