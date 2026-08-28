// offline.test.mjs — gerbang penerimaan M2: aplikasi harus termuat penuh tanpa jaringan.
//
// Cacat §5.2 v2.1: kode sudah menyiapkan antrean pending untuk kondisi offline, tetapi
// aplikasi tidak punya service worker maupun manifest. Artinya bila sekolah tidak punya
// koneksi ketika halaman pertama dibuka, aplikasinya tidak termuat sama sekali —
// antrean offline hanya berguna kalau halamannya sudah lebih dulu di-cache.
//
// Uji ini menangkap mode kegagalan yang paling mudah terjadi: menambah modul baru dan lupa
// mendaftarkannya di SHELL. Di lapangan gejalanya baru muncul saat perangkat sudah offline
// di sekolah — waktu paling buruk untuk menemukannya.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sw = readFileSync(join(root, 'sw.js'), 'utf8');

const SHELL = sw.match(/const SHELL = \[([\s\S]*?)\];/)[1]
  .match(/'([^']+)'/g).map((s) => s.slice(1, -1).replace(/^\.\//, ''));

function walk(dir) {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);
}

describe('Cangkang offline', () => {
  test('setiap berkas dalam SHELL benar-benar ada', () => {
    for (const p of SHELL) {
      if (p === '') continue;                    // './' = navigasi akar
      assert.ok(existsSync(join(root, p)), `SHELL menunjuk berkas yang tidak ada: ${p}`);
    }
  });

  test('SETIAP modul JS ikut tersimpan — tidak ada yang tertinggal', () => {
    const shell = new Set(SHELL);
    const tertinggal = walk('js').filter((f) => !shell.has(f));
    assert.deepEqual(tertinggal, [],
      `modul ini tidak akan tersedia saat offline:\n  ${tertinggal.join('\n  ')}\n` +
      'Tambahkan ke daftar SHELL di sw.js.');
  });

  test('CSS dan manifest ikut tersimpan', () => {
    const shell = new Set(SHELL);
    assert.ok(shell.has('assets/css/styles.css'));
    assert.ok(shell.has('manifest.webmanifest'));
    assert.ok(shell.has('index.html'));
  });

  test('ikon yang dirujuk manifest benar-benar ada', () => {
    const man = JSON.parse(readFileSync(join(root, 'manifest.webmanifest'), 'utf8'));
    for (const ikon of man.icons) {
      assert.ok(existsSync(join(root, ikon.src)), `manifest merujuk ikon yang hilang: ${ikon.src}`);
      assert.ok(statSync(join(root, ikon.src)).size > 0, `ikon kosong: ${ikon.src}`);
    }
  });

  test('TIDAK ADA sumber eksternal yang DIMUAT', () => {
    // ViaMath memuat Tailwind, Phosphor, dan Google Fonts dari tiga CDN dan tak punya
    // service worker; menyalin pola itu akan membuat CognoKids MUNDUR, karena v2.1 justru
    // sudah swasembada. Aturan v3: nol sumber eksternal.
    //
    // Yang diperiksa adalah bentuk yang benar-benar MEMUAT sesuatu — src=, href=, url(),
    // @import, importScripts. Sebuah URL yang kebetulan muncul sebagai teks (placeholder
    // kolom isian, contoh di komentar) tidak memuat apa pun dan bukan pelanggaran.
    const POLA = [
      /\bsrc\s*=\s*["']https?:/i,
      /\bhref\s*=\s*["']https?:/i,
      /url\(\s*["']?https?:/i,
      /@import\s+(url\()?["']https?:/i,
      /importScripts\(\s*["']https?:/i,
      /\bfrom\s+["']https?:/i,          // import modul dari CDN
    ];
    const berkas = ['index.html', 'sw.js', 'manifest.webmanifest', 'assets/css/styles.css', ...walk('js')];
    for (const f of berkas) {
      const isi = readFileSync(join(root, f), 'utf8');
      for (const re of POLA) {
        const hit = isi.match(re);
        assert.equal(hit, null,
          `${f} memuat sumber eksternal: "${hit?.[0]}". ` +
          'Bundel secara lokal — aplikasi harus jalan di sekolah tanpa sinyal.');
      }
    }
  });

  test('index.html hanya memuat berkas dari repo ini sendiri', () => {
    const html = readFileSync(join(root, 'index.html'), 'utf8');
    const dimuat = [...html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g)].map((m) => m[1]);
    assert.ok(dimuat.length > 0);
    for (const u of dimuat) {
      if (u.startsWith('data:')) continue;   // favicon SVG sebaris — tidak diunduh
      assert.doesNotMatch(u, /^https?:|^\/\//, `index.html memuat ${u} dari luar`);
      assert.ok(existsSync(join(root, u)), `index.html memuat berkas yang tidak ada: ${u}`);
    }
  });

  test('versi cache dinaikkan bersama versi aplikasi', () => {
    const cache = sw.match(/const CACHE = '([^']+)'/)[1];
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    assert.ok(cache.includes(pkg.version),
      `CACHE "${cache}" tidak memuat versi ${pkg.version} — peramban akan menyajikan berkas lama.`);
  });

  test('viewport tidak mematikan cubit-perbesar (regresi cacat §7.5)', () => {
    const html = readFileSync(join(root, 'index.html'), 'utf8');
    const vp = html.match(/<meta name="viewport"[^>]*>/)[0];
    assert.doesNotMatch(vp, /user-scalable\s*=\s*no/, 'gagal WCAG 1.4.4');
    assert.doesNotMatch(vp, /maximum-scale\s*=\s*1/, 'gagal WCAG 1.4.4');
  });
});
