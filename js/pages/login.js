// pages/login.js — pendaftaran peserta.
//
// Memperbaiki tiga cacat v2.1 sekaligus:
//  KON-1 — kolom `kondisi` di-hardcode 'A' dan tak pernah ditanyakan, sehingga seluruh
//          baris data tertulis "Pagi" apa pun waktu sesi sebenarnya. Kini wajib dipilih.
//  §4.5  — pesan galat berbunyi "Semua kolom termasuk jenis kelamin harus diisi!" tanpa
//          menunjuk kolom mana. Kini tiap kolom punya pesannya sendiri di bawahnya.
//  §7.7  — label "Perempuan" terlipat dua baris sehingga kedua kartu beda tinggi.
//          Kini grid dengan min-height seragam.
//
// Rombakan rupa v3.9 — SATU perubahan susunan, dan alasannya bukan selera.
//
// Layar ini menyapa anak ("Kenalan dulu, yuk!") lalu langsung menyodorkan enam kolom
// berderet, empat di antaranya bertanda "— diisi pendamping". Bagian milik anak — nama
// panggilan dan laki-laki/perempuan — terselip di antara nomor peserta, nama sekolah, dan
// kelas. Anak yang membacanya melihat formulir orang dewasa yang kebetulan menyebut
// namanya, dan kesan pertama itu berlaku untuk 25 menit berikutnya.
//
// Sekarang keduanya dipisah menjadi dua panel: satu miliknya, satu milik pendamping.
// Kolomnya sama persis, urutan datanya sama persis, validasinya sama persis — yang
// berubah hanya siapa yang jelas sedang diajak bicara.

import { KONDISI } from '../config.js';
import { Store } from '../store.js';
import { bilah, layar } from '../components/ui.js';
import { sapaan } from '../components/maskot.js';

const KELAS = ['3', '4', '5', '6'];
const GENDER = [
  { id: 'L', label: 'Laki-laki', emoji: '👦' },
  { id: 'P', label: 'Perempuan', emoji: '👧' },
];

export function renderLogin(app, { onDone }) {
  const draft = { nama: '', id: '', kelas: '', sekolah: '', gender: '', kondisi: '' };

  app.innerHTML =
    bilah({ emoji: '🦉', judul: 'CognoKids Explorer' }) +
    layar(`
      ${sapaan('sapa', 'Halo! Aku <b>Puti</b>.<br>Kita main bareng, ya.')}

      <div class="card">
        <div class="panel-judul"><span aria-hidden="true">✏️</span> Tentang kamu</div>

        <div class="field">
          <label for="f-nama">Nama panggilan</label>
          <input id="f-nama" autocomplete="off" enterkeyhint="next" placeholder="Contoh: Rani">
          <div class="err" id="e-nama"></div>
        </div>

        <div class="field" style="margin-bottom:0">
          <span class="label" id="l-gender">Kamu laki-laki atau perempuan?</span>
          <div class="choice cols-2" role="group" aria-labelledby="l-gender" id="g-gender">
            ${GENDER.map((g) => `
              <button type="button" data-val="${g.id}" aria-pressed="false">
                <span class="big" aria-hidden="true">${g.emoji}</span>
                <span>${g.label}</span>
              </button>`).join('')}
          </div>
          <div class="err" id="e-gender"></div>
        </div>
      </div>

      <div class="card panel-pendamping">
        <div class="panel-judul"><span aria-hidden="true">📋</span> Diisi pendamping</div>

        <div class="field">
          <label for="f-id">Nomor / kode peserta</label>
          <input id="f-id" autocomplete="off" inputmode="text" placeholder="Contoh: S1-014">
          <div class="err" id="e-id"></div>
        </div>

        <div class="field">
          <label for="f-sekolah">Sekolah</label>
          <input id="f-sekolah" autocomplete="off" placeholder="Nama sekolah">
          <div class="err" id="e-sekolah"></div>
        </div>

        <div class="field">
          <label for="f-kelas">Kelas</label>
          <select id="f-kelas">
            <option value="">— pilih kelas —</option>
            ${KELAS.map((k) => `<option value="${k}">Kelas ${k}</option>`).join('')}
          </select>
          <div class="err" id="e-kelas"></div>
        </div>

        <div class="field" style="margin-bottom:0">
          <span class="label" id="l-kondisi">Waktu pengukuran</span>
          <p class="kecil" style="margin:-2px 0 9px">Dipakai untuk mencocokkan dengan data lingkungan kelas.</p>
          <div class="choice cols-3" role="group" aria-labelledby="l-kondisi" id="g-kondisi">
            ${KONDISI.map((k) => `
              <button type="button" data-val="${k.id}" aria-pressed="false">
                <span>${k.label}</span>
                <span class="hint">${k.jam}</span>
              </button>`).join('')}
          </div>
          <div class="err" id="e-kondisi"></div>
        </div>
      </div>

      <button class="btn btn-primary" id="f-mulai">Mulai Petualangan →</button>`);

  // ── Kelompok pilihan ──
  const wireGroup = (containerId, key) => {
    const box = app.querySelector(`#${containerId}`);
    box.addEventListener('click', (ev) => {
      const btn = ev.target.closest('button[data-val]');
      if (!btn) return;
      draft[key] = btn.dataset.val;
      box.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      clearError(key);
    });
  };
  wireGroup('g-gender', 'gender');
  wireGroup('g-kondisi', 'kondisi');

  // ── Kolom teks ──
  for (const key of ['nama', 'id', 'sekolah', 'kelas']) {
    const el = app.querySelector(`#f-${key}`);
    el.addEventListener('input', () => { draft[key] = el.value.trim(); clearError(key); });
  }

  const setError = (key, msg) => {
    const err = app.querySelector(`#e-${key}`);
    if (err) err.textContent = msg;
    const input = app.querySelector(`#f-${key}`);
    if (input) input.setAttribute('aria-invalid', 'true');
  };
  const clearError = (key) => {
    const err = app.querySelector(`#e-${key}`);
    if (err) err.textContent = '';
    const input = app.querySelector(`#f-${key}`);
    if (input) input.removeAttribute('aria-invalid');
  };

  app.querySelector('#f-mulai').addEventListener('click', () => {
    // Pesan menunjuk kolom yang kosong — bukan satu pesan umum di bawah layar (§4.5).
    // Urutannya mengikuti urutan KOLOM DI LAYAR, supaya kolom pertama yang digulir
    // menuju pandangan benar-benar yang paling atas di antara yang kosong.
    const wajib = [
      ['nama', 'Nama panggilan belum diisi.'],
      ['gender', 'Jenis kelamin belum dipilih.'],
      ['id', 'Nomor atau kode peserta belum diisi.'],
      ['sekolah', 'Nama sekolah belum diisi.'],
      ['kelas', 'Kelas belum dipilih.'],
      ['kondisi', 'Waktu pengukuran belum dipilih.'],
    ];
    let first = null;
    for (const [key, msg] of wajib) {
      if (!draft[key]) { setError(key, msg); first ??= key; } else clearError(key);
    }
    if (first) {
      const el = app.querySelector(`#f-${first}`) || app.querySelector(`#g-${first} button`);
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el?.focus?.();
      return;
    }
    Store.start(draft);
    onDone();
  });
}

/** Layar tawaran melanjutkan sesi yang terputus — buah dari snapshot per game (§5.1). */
export function renderResume(app, { onResume, onRestart }) {
  const s = Store.get();
  const selesai = Object.keys(s.games).length;
  app.innerHTML =
    bilah({ emoji: '🦉', judul: 'Lanjutkan permainan?' }) +
    layar(`
      ${sapaan('sapa', `Halo lagi, <b>${escapeHtml(s.participant?.nama ?? '')}</b>!<br>
        Permainanmu tadi belum selesai.`)}
      <div class="card center">
        <p class="muted">Kamu sudah main <b>${selesai} dari ${s.gameOrder.length}</b> permainan.</p>
        <div style="margin-top:16px;display:grid;gap:11px">
          <button class="btn btn-primary" id="r-lanjut">Lanjutkan permainannya</button>
          <button class="btn btn-ghost" id="r-ulang">Mulai peserta baru</button>
        </div>
      </div>`);
  app.querySelector('#r-lanjut').addEventListener('click', onResume);
  app.querySelector('#r-ulang').addEventListener('click', () => {
    if (confirm('Data peserta sebelumnya yang belum selesai akan dihapus. Lanjutkan?')) onRestart();
  });
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
