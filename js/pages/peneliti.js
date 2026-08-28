// pages/peneliti.js — layar peneliti. SATU-SATUNYA layar yang boleh menampilkan label riset.
//
// Dipisahkan dari selesai.js dengan sengaja: penjaga di test/no-research-labels.test.mjs
// memindai seluruh js/pages dan js/games, dan berkas ini adalah satu-satunya pengecualian.
// Kalau layar peneliti tetap menumpang di berkas layar anak, penjaganya kehilangan makna —
// ia akan lulus tanpa benar-benar membuktikan apa pun.
//
// Jalan masuknya tidak diiklankan di mana pun (cacat §5.4: v2.1 menulis "Ketuk logo 5×
// untuk mode uji" tepat di footer layar peserta).

import { DIMENSIONS, kategoriOf } from '../config.js';
import { calcScores, scoresPerGame, forDisplay } from '../scoring.js';
import { Store } from '../store.js';
import { Api, getBackendConfig, setBackendConfig } from '../api.js';
import { Archive } from '../archive.js';
import { toCsv, withBom } from '../export.js';
import { escapeHtml } from '../util.js';
import { setPin, pinMasihBawaan } from '../pin.js';

/** Unduh teks sebagai berkas. BOM UTF-8 agar Excel di Windows membaca huruf beraksen benar. */
function unduh(namaBerkas, isi) {
  const blob = new Blob([withBom(isi)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = namaBerkas;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stempel = () => new Date().toISOString().slice(0, 10);

export function renderPeneliti(app, { onNewParticipant }) {
  const s = Store.get();
  const { scores, aligned, composite } = calcScores(Store.vacsBlocks());
  const perGame = scoresPerGame(Store.vacsByGame());
  const kat = composite === null ? null : kategoriOf(composite);

  const row = (label, val, extra = '') =>
    `<div style="display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid var(--line)">
       <span style="font-size:14px">${label}</span>
       <span style="font-size:14px;font-weight:700;color:var(--ink)">${val}${extra}</span>
     </div>`;

  app.innerHTML = `
    <div class="topbar" style="background:#1E1B4B">
      <span style="font-size:20px" aria-hidden="true">🔬</span>
      <div style="flex:1"><h1>Mode Peneliti</h1><div class="sub">${escapeHtml(s.participant?.id ?? '')} · ${escapeHtml(s.participant?.nama ?? '')}</div></div>
    </div>
    <div class="screen">
      <div class="card">
        <h3>Skor ergonomi kognitif</h3>
        <p class="muted" style="font-size:12.5px;margin:4px 0 10px">
          Komposit dihitung dari beban dan sudah diselaraskan arahnya.
          Rentang teoretis instrumen <b>10–90</b>, bukan 0–100.
        </p>
        ${composite === null
          ? '<p class="muted">Belum ada blok VACS yang terisi.</p>'
          : `<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:10px">
               <span style="font-size:34px;font-weight:800;color:${kat.color}">${forDisplay(composite)}</span>
               <span class="muted">/ 90 · ${kat.emoji} ${kat.label}</span>
             </div>
             ${DIMENSIONS.map((d) => row(
               `${d.id} ${d.name}`,
               forDisplay(scores[d.id]),
               `<span class="muted" style="font-weight:400;font-size:12px"> (selaras ${forDisplay(aligned[d.id])})</span>`,
             )).join('')}`}
      </div>

      <div class="card">
        <h3>Diagnostisitas — skor per game</h3>
        <p class="muted" style="font-size:12.5px;margin:4px 0 10px">
          Tiap game seharusnya memuncak pada dimensi yang dirancang untuk dipantiknya.
          v2.1 merata-ratakan semuanya lebih dulu sehingga perbandingan ini tak bisa dibaca.
        </p>
        ${Object.keys(perGame).length === 0
          ? '<p class="muted">Belum ada data.</p>'
          : Object.entries(perGame).map(([gid, r]) =>
              row(gid.toUpperCase(), DIMENSIONS.map((d) => `${d.id}:${forDisplay(r.scores[d.id])}`).join(' · '))).join('')}
      </div>

      <div class="card">
        <h3>Data objektif</h3>
        ${Object.keys(s.games).length === 0
          ? '<p class="muted">Belum ada game yang selesai.</p>'
          : Object.entries(s.games).map(([gid, g]) =>
              row(gid.toUpperCase(), `${Object.entries(g).filter(([k]) => k !== 'finishedAt')
                .map(([k, v]) => `${k}=${typeof v === 'number' ? Math.round(v * 100) / 100 : v}`).join(', ')}`)).join('')}
        ${row('Catatan per-trial', s.trials.length)}
      </div>

      <div class="card">
        <h3>Sinkronisasi</h3>
        ${row('Backend', Api.configured() ? 'dikonfigurasi' : 'belum — mode luring')}
        ${row('Status sesi ini', s.synced ? '✅ terkirim & dikonfirmasi server' : '⏳ belum dikonfirmasi')}
        ${row('Antrean tertunda', Api.queueDepth())}
        <p class="muted" style="font-size:12.5px;margin-top:8px">
          Status "terkirim" hanya muncul setelah server benar-benar membalas.
        </p>
        <button class="btn btn-ghost" id="p-flush" style="margin-top:10px">Coba kirim ulang antrean</button>
      </div>

      ${pinMasihBawaan() ? `
        <div class="card" style="border:2px solid var(--warn);background:#FFFBEB">
          <h3>⚠️ PIN masih bawaan</h3>
          <p class="muted" style="font-size:13px;margin-top:6px">
            Repo frontend bersifat publik, jadi PIN bawaan diketahui umum. Ganti sekali
            per perangkat saat penyiapan.
          </p>
        </div>` : ''}

      <div class="card">
        <h3>PIN peneliti perangkat ini</h3>
        <div class="field" style="margin-top:8px">
          <label for="b-pin">PIN baru (4–8 angka)</label>
          <input id="b-pin" type="password" inputmode="numeric" autocomplete="off" placeholder="••••">
          <div class="err" id="b-pin-err"></div>
        </div>
        <button class="btn btn-ghost" id="b-pin-simpan">Ganti PIN</button>
      </div>

      <div class="card">
        <h3>Backend perangkat ini</h3>
        <p class="muted" style="font-size:12.5px;margin:4px 0 10px">
          Diisi sekali per perangkat saat penyiapan. Tidak disimpan di dalam kode aplikasi,
          sehingga versi yang di-deploy tidak memuat kredensial apa pun.
        </p>
        <div class="field">
          <label for="b-url">URL backend</label>
          <input id="b-url" value="${escapeHtml(getBackendConfig().baseUrl)}"
                 placeholder="https://…cloudfunctions.net/cognokids" autocomplete="off">
        </div>
        <div class="field">
          <label for="b-token">Token tulis</label>
          <input id="b-token" type="password" value="${escapeHtml(getBackendConfig().token)}"
                 placeholder="INGEST_TOKEN" autocomplete="off">
          <div class="err" id="b-err"></div>
        </div>
        <button class="btn btn-ghost" id="b-simpan">Simpan &amp; uji koneksi</button>
        <p class="muted" style="font-size:12px;margin-top:8px">
          Kosongkan URL untuk mode luring penuh — data tetap terarsip di perangkat dan
          diunduh sebagai CSV.
        </p>
      </div>

      <div class="card">
        <h3>Arsip perangkat ini</h3>
        <p class="muted" style="font-size:12.5px;margin:4px 0 10px">
          Setiap sesi yang tuntas diarsip di perangkat ini, terpisah dari antrean
          sinkronisasi. Ini salinan yang tidak bergantung pada jaringan maupun backend.
        </p>
        ${row('Sesi terarsip', Archive.count())}
        ${row('Pemakaian penyimpanan', `${Archive.sizeKb()} KB`)}
        <div style="display:grid;gap:8px;margin-top:12px">
          <button class="btn btn-primary" id="p-csv-sesi" ${Archive.count() ? '' : 'disabled style="opacity:.5"'}>
            ⬇︎ Unduh sessions.csv
          </button>
          <button class="btn btn-primary" id="p-csv-trial" ${Archive.count() ? '' : 'disabled style="opacity:.5"'}>
            ⬇︎ Unduh trials.csv
          </button>
          <button class="btn btn-ghost" id="p-hapus" ${Archive.count() ? '' : 'disabled style="opacity:.5"'}>
            Hapus arsip perangkat ini
          </button>
        </div>
        <p class="muted" style="font-size:12px;margin-top:10px">
          ⚠️ Unduh <b>kedua</b> berkas lebih dulu sebelum menghapus. Setelah dihapus, data
          tidak bisa dikembalikan dari perangkat ini.
        </p>
      </div>

      <button class="btn btn-primary" id="p-baru">Peserta berikutnya</button>
    </div>`;

  app.querySelector('#b-pin-simpan')?.addEventListener('click', (ev) => {
    const r = setPin(app.querySelector('#b-pin').value);
    const err = app.querySelector('#b-pin-err');
    if (!r.ok) { err.textContent = r.error; return; }
    err.textContent = '';
    ev.target.textContent = '✅ PIN diganti';
    app.querySelector('#b-pin').value = '';
  });

  app.querySelector('#b-simpan')?.addEventListener('click', async (ev) => {
    const baseUrl = app.querySelector('#b-url').value;
    const token = app.querySelector('#b-token').value;
    const err = app.querySelector('#b-err');
    setBackendConfig({ baseUrl, token });
    if (!baseUrl.trim()) { err.textContent = ''; ev.target.textContent = 'Mode luring penuh disimpan'; return; }
    ev.target.textContent = 'Menguji…';
    try {
      // Uji koneksi SUNGGUHAN, bukan sekadar menyimpan. Menyimpan konfigurasi lalu
      // menganggapnya berhasil adalah pola yang sama dengan cacat §3.2.
      const res = await fetch(`${baseUrl.trim().replace(/\/$/, '')}/health`);
      const body = await res.json();
      err.textContent = '';
      ev.target.textContent = res.ok && body.ok
        ? `✅ Terhubung · DB ${body.data?.db ?? '?'}`
        : `⚠️ Server membalas: ${body.error ?? res.status}`;
    } catch (e) {
      err.textContent = `Tidak bisa dihubungi: ${e.message}. Konfigurasi tetap disimpan.`;
      ev.target.textContent = 'Simpan & uji koneksi';
    }
  });

  app.querySelector('#p-flush').addEventListener('click', async (ev) => {
    ev.target.textContent = 'Mengirim…';
    const { sent, remaining } = await Api.flush();
    ev.target.textContent = `Terkirim ${sent}, tersisa ${remaining}`;
  });
  let sesiDiunduh = false;
  let trialDiunduh = false;

  app.querySelector('#p-csv-sesi')?.addEventListener('click', () => {
    unduh(`cognokids-sessions-${stempel()}.csv`, toCsv(Archive.all().map((r) => r.entry)));
    sesiDiunduh = true;
  });

  app.querySelector('#p-csv-trial')?.addEventListener('click', () => {
    unduh(`cognokids-trials-${stempel()}.csv`, toCsv(Archive.all().flatMap((r) => r.trials)));
    trialDiunduh = true;
  });

  app.querySelector('#p-hapus')?.addEventListener('click', () => {
    // Dua penghalang: harus sudah mengunduh keduanya, lalu mengetik konfirmasi.
    if (!sesiDiunduh || !trialDiunduh) {
      alert('Unduh sessions.csv DAN trials.csv lebih dulu. Arsip belum dihapus.');
      return;
    }
    const n = Archive.count();
    if (prompt(`Hapus ${n} sesi dari perangkat ini? Ketik HAPUS untuk melanjutkan.`) !== 'HAPUS') return;
    Archive.clear();
    renderPeneliti(app, { onNewParticipant });
  });

  app.querySelector('#p-baru').addEventListener('click', onNewParticipant);
}
