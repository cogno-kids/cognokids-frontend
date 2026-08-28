// pages/selesai.js — layar penutup untuk ANAK, dan layar peneliti di baliknya.
//
// Cacat §7.3 v2.1: sepanjang sesi anak diyakinkan "tidak ada jawaban benar atau salah" dan
// "tidak ada yang dinilai" — lalu di akhir ia langsung melihat angka besar ("52 / 100") dan
// label seperti "Rendah", termasuk untuk dimensi Kenyamanan Psikologis. Itu bertentangan
// dengan janji yang baru saja disampaikan.
//
// Di v3 anak mendapat layar penutup yang hangat tanpa angka. Skor hanya terlihat di mode
// peneliti, yang jalan masuknya TIDAK diiklankan (cacat §5.4: v2.1 menulis "Ketuk logo 5×
// untuk mode uji" di footer layar peserta).

import { APP } from '../config.js';
import { Store } from '../store.js';
import { escapeHtml } from '../util.js';
import { renderPeneliti } from './peneliti.js';
import { getPin } from '../pin.js';

export function renderSelesai(app, { onNewParticipant }) {
  const s = Store.get();
  let taps = 0;
  let tapTimer = null;

  app.innerHTML = `
    <div class="topbar"><span style="font-size:22px" aria-hidden="true">🎉</span><h1>Selesai!</h1></div>
    <div class="screen">
      <div class="card center">
        <div style="font-size:70px;cursor:default" id="s-logo" aria-hidden="true">🌟</div>
        <h2 style="margin-top:10px">Terima kasih, ${escapeHtml(s.participant?.nama ?? '')}!</h2>
        <p class="muted" style="margin-top:12px;font-size:16px">
          Kamu sudah menyelesaikan semua permainan. Hebat!
        </p>
        <p class="muted" style="margin-top:10px">
          Ingat ya — tadi <b>bukan ujian</b>. Tidak ada yang benar, tidak ada yang salah.
          Kamu sudah sangat membantu. 💙
        </p>
      </div>
      <div class="card center">
        <p class="muted" style="font-size:14.5px">Sekarang kembalikan HP-nya ke Bapak/Ibu ya.</p>
      </div>
      <div class="center" style="padding-top:4px">
        <span class="muted" style="font-size:11px;opacity:.55">v${APP.version}</span>
      </div>
    </div>`;

  // Jalan masuk mode peneliti: ketuk bintang 5×. Tidak disebutkan di mana pun di layar.
  app.querySelector('#s-logo').addEventListener('click', () => {
    taps += 1;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { taps = 0; }, 2500);
    if (taps >= 5) {
      taps = 0;
      const masuk = prompt('PIN peneliti:');
      if (masuk === getPin()) renderPeneliti(app, { onNewParticipant });
    }
  });
}
