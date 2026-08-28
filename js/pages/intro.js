// pages/intro.js — layar pembuka tiap mini-game.
//
// Cacat §7.2 v2.1: bilah atas tiap permainan memuat badge "EK1".."EK4". Di sini hanya nama
// yang dikenal anak. Pemetaan dimensinya hidup di config.js dan tak pernah dirender.
//
// Rombakan rupa v3.9. Layar ini sebelumnya: bilah indigo, kartu putih berisi emoji 64px,
// kartu putih kedua berisi dua baris abu, tombol indigo. Sama persis untuk keempat
// permainan kecuali emojinya. Anak tidak merasa berpindah ke mana-mana.
//
// Sekarang layar ini yang paling banyak berubah, karena di sinilah anak memutuskan apakah
// hal berikutnya menarik:
//   • seluruh layar mengambil warna permainannya (config.js → GAMES[].warna);
//   • kemajuan sesi tampil sebagai empat bintang, bukan tulisan "Permainan 2 dari 4"
//     berukuran 12px di pojok bilah;
//   • Puti yang mengucapkan "tidak ada yang benar atau salah" — kalimat itu sebelumnya
//     datang dari "kami" yang tak berwujud, di dalam kartu abu yang mudah dilewati.

import { escapeHtml } from '../util.js';
import { Store } from '../store.js';
import { bilah, layar, jejak } from '../components/ui.js';
import { sapaan } from '../components/maskot.js';

export function renderIntro(app, { game, onStart }) {
  const s = Store.get();
  const ke = s.cursor.index + 1;
  const total = s.gameOrder.length;
  const sudah = ke - 1;

  // Medali di bilah SENGAJA dikosongkan di layar ini: emoji yang sama sudah tampil besar
  // tepat di bawahnya, dan menampilkannya dua kali membuat mata anak mencari bedanya.
  app.innerHTML =
    bilah({
      judul: game.childName,
      sub: `Permainan ${ke} dari ${total}`,
      kanan: jejak(sudah, total, sudah > 0),
      warna: game.warna,
    }) +
    layar(`
      <div class="card center">
        <div class="lencana-besar" aria-hidden="true">${game.emoji}</div>
        <p class="intro-teks">${escapeHtml(game.intro)}</p>
      </div>

      ${sapaan('sapa', 'Santai saja ya.<br><b>Tidak ada yang benar atau salah.</b>')}

      <button class="btn btn-game dorong" id="i-go">Ayo main! →</button>`,
      { warna: game.warna });

  app.querySelector('#i-go').addEventListener('click', onStart);
}
