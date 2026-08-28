// pages/selesai.js — layar penutup untuk ANAK, dan jalan masuk ke layar peneliti.
//
// Cacat §7.3 v2.1: sepanjang sesi anak diyakinkan "tidak ada jawaban benar atau salah" dan
// "tidak ada yang dinilai" — lalu di akhir ia langsung melihat angka besar ("52 / 100") dan
// label seperti "Rendah", termasuk untuk dimensi Kenyamanan Psikologis. Itu bertentangan
// dengan janji yang baru saja disampaikan.
//
// Di v3 anak mendapat layar penutup yang hangat tanpa angka. Skor hanya terlihat di mode
// peneliti, yang jalan masuknya TIDAK diiklankan (cacat §5.4: v2.1 menulis "Ketuk logo 5×
// untuk mode uji" di footer layar peserta).
//
// Rombakan rupa v3.9: keempat bintang muncul penuh, dan ada hujan kertas warna sekali.
// Perayaan ini dipicu oleh MENYELESAIKAN, bukan oleh bermain bagus — setiap anak sampai
// ke sini, jadi ia tidak menyampaikan penilaian apa pun. Itu batas yang membuatnya boleh
// ada sama sekali di dalam alat ukur.

import { APP } from '../config.js';
import { Store } from '../store.js';
import { escapeHtml } from '../util.js';
import { bilah, layar, jejak, pesta } from '../components/ui.js';
import { sapaan } from '../components/maskot.js';
import { renderPeneliti } from './peneliti.js';
import { getPin } from '../pin.js';

export function renderSelesai(app, { onNewParticipant }) {
  const s = Store.get();
  const total = s.gameOrder?.length ?? 4;
  let taps = 0;
  let tapTimer = null;

  app.innerHTML =
    bilah({ emoji: '🎉', judul: 'Selesai!' }) +
    layar(`
      <div class="card center rayakan">
        <div class="jejak-besar">${jejak(total, total, true)}</div>
        <h2>Terima kasih, ${escapeHtml(s.participant?.nama ?? '')}!</h2>
        <p class="muted" style="margin-top:10px">Kamu sudah main semuanya. Hebat!</p>
      </div>

      ${sapaan('sapa', 'Ingat ya, tadi <b>bukan ujian</b>.<br>Kamu sudah sangat membantu 💙')}

      <div class="card center">
        <p class="muted">Sudah selesai. Panggil Bapak/Ibu ya.</p>
      </div>

      <div class="center" style="padding-top:2px">
        <span class="kecil" id="s-logo" style="opacity:.6;cursor:default">v${APP.version}</span>
      </div>`);

  const berhenti = pesta();

  // Jalan masuk mode peneliti: ketuk nomor versi 5×. Tidak disebutkan di mana pun.
  // Sebelumnya pemicunya bintang 🌟 besar di tengah layar — benda yang paling menarik
  // untuk diketuk berkali-kali oleh anak yang baru selesai bermain.
  app.querySelector('#s-logo').addEventListener('click', () => {
    taps += 1;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { taps = 0; }, 2500);
    if (taps >= 5) {
      taps = 0;
      const masuk = prompt('PIN peneliti:');
      if (masuk === getPin()) { berhenti(); renderPeneliti(app, { onNewParticipant }); }
    }
  });
}
