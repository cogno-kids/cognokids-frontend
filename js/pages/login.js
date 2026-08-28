// pages/login.js — pendaftaran peserta.
//
// Memperbaiki tiga cacat v2.1 sekaligus:
//  KON-1 — kolom `kondisi` di-hardcode 'A' dan tak pernah ditanyakan, sehingga seluruh
//          baris data tertulis "Pagi" apa pun waktu sesi sebenarnya. Kini wajib dipilih.
//  §4.5  — pesan galat berbunyi "Semua kolom termasuk jenis kelamin harus diisi!" tanpa
//          menunjuk kolom mana. Kini tiap kolom punya pesannya sendiri di bawahnya.
//  §7.7  — label "Perempuan" terlipat dua baris sehingga kedua kartu beda tinggi.
//          Kini grid dengan min-height seragam.

import { KONDISI } from '../config.js';
import { Store } from '../store.js';

const KELAS = ['3', '4', '5', '6'];
const GENDER = [
  { id: 'L', label: 'Laki-laki', emoji: '👦' },
  { id: 'P', label: 'Perempuan', emoji: '👧' },
];

export function renderLogin(app, { onDone }) {
  const draft = { nama: '', id: '', kelas: '', sekolah: '', gender: '', kondisi: '' };

  app.innerHTML = `
    <div class="topbar">
      <span style="font-size:22px" aria-hidden="true">🧠</span>
      <h1>CognoKids Explorer</h1>
    </div>
    <div class="screen">
      <div class="card">
        <h2>Kenalan dulu, yuk!</h2>
        <p class="muted" style="margin:6px 0 16px">Isi dulu ya, supaya kami tahu ini punya siapa.</p>

        <div class="field">
          <label for="f-nama">Nama panggilan</label>
          <input id="f-nama" autocomplete="off" enterkeyhint="next" placeholder="Contoh: Rani">
          <div class="err" id="e-nama"></div>
        </div>

        <div class="field">
          <label for="f-id">Nomor / kode peserta <span style="font-weight:500;color:var(--ink-3)">— diisi pendamping</span></label>
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

        <div class="field">
          <span class="label" id="l-gender" style="display:block;font-size:14px;font-weight:600;margin-bottom:6px">Jenis kelamin</span>
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

      <div class="card">
        <span class="label" id="l-kondisi" style="display:block;font-size:14px;font-weight:600;margin-bottom:2px">Waktu pengukuran</span>
        <p class="muted" style="font-size:13.5px;margin-bottom:10px">Diisi pendamping — dipakai untuk mencocokkan dengan pengukuran lingkungan kelas.</p>
        <div class="choice cols-3" role="group" aria-labelledby="l-kondisi" id="g-kondisi">
          ${KONDISI.map((k) => `
            <button type="button" data-val="${k.id}" aria-pressed="false">
              <span>${k.label}</span>
              <span class="hint">${k.jam}</span>
            </button>`).join('')}
        </div>
        <div class="err" id="e-kondisi"></div>
      </div>

      <button class="btn btn-primary" id="f-mulai">Mulai Petualangan →</button>
    </div>`;

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
    const wajib = [
      ['nama', 'Nama panggilan belum diisi.'],
      ['id', 'Nomor atau kode peserta belum diisi.'],
      ['sekolah', 'Nama sekolah belum diisi.'],
      ['kelas', 'Kelas belum dipilih.'],
      ['gender', 'Jenis kelamin belum dipilih.'],
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
  app.innerHTML = `
    <div class="topbar"><span style="font-size:22px" aria-hidden="true">🧠</span><h1>Lanjutkan sesi?</h1></div>
    <div class="screen">
      <div class="card center">
        <div style="font-size:46px" aria-hidden="true">👋</div>
        <h2 style="margin-top:8px">Halo lagi, ${escapeHtml(s.participant?.nama ?? '')}!</h2>
        <p class="muted" style="margin-top:8px">
          Permainanmu tadi belum selesai. Kamu sudah menyelesaikan
          <b>${selesai} dari ${s.gameOrder.length}</b> permainan.
        </p>
        <div style="margin-top:16px;display:grid;gap:10px">
          <button class="btn btn-primary" id="r-lanjut">Lanjutkan dari tadi</button>
          <button class="btn btn-ghost" id="r-ulang">Mulai peserta baru</button>
        </div>
      </div>
    </div>`;
  app.querySelector('#r-lanjut').addEventListener('click', onResume);
  app.querySelector('#r-ulang').addEventListener('click', () => {
    if (confirm('Data peserta sebelumnya yang belum selesai akan dihapus. Lanjutkan?')) onRestart();
  });
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
