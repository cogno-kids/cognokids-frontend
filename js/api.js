// api.js — sinkronisasi ke backend. Offline-first, tetapi TIDAK PERNAH berbohong.
//
// Cacat P0 3.2 v2.1: `await fetch(url, {mode:'no-cors'}); return true;`. Dengan no-cors
// peramban menyembunyikan jawaban server, sehingga aplikasi tidak bisa membedakan "data
// masuk" dari "skrip error / URL kedaluwarsa / izin dicabut / kuota habis" — dan tetap
// menampilkan "✅ terkirim". Skenario terburuknya: 60 sekolah, layar selalu hijau, dan baru
// ketahuan di akhir bahwa basis datanya kosong.
//
// Di v3: fetch biasa + CORS eksplisit di backend + periksa res.ok. `synced` hanya ditandai
// setelah server benar-benar membalas 2xx. Kegagalan tidak memblok anak — masuk antrean —
// tetapi kedalaman antrean WAJIB ditampilkan ke pendamping (lihat pages/peneliti.js).

import { APP } from './config.js';

// ── Konfigurasi lapangan ─────────────────────────────────────────────────────
// URL backend dan token TIDAK ditulis di dalam kode sumber.
//
// Cacat §5.3 v2.1: alamat Apps Script tertulis apa adanya di skrip yang dikirim ke setiap
// peramban. Menambahkan token bersama ke dalam kode sumber hanya memindahkan masalahnya —
// siapa pun yang membuka "view source" tetap mendapatkannya.
//
// Di v3 keduanya dimasukkan SEKALI oleh pendamping lewat layar peneliti dan disimpan di
// localStorage perangkat itu. Yang di-deploy ke Netlify karenanya tidak memuat kredensial
// apa pun. Ini bukan pengamanan sempurna — siapa pun yang memegang ponsel lapangan yang
// sudah disiapkan bisa membacanya dari devtools — tetapi ia menghapus kebocoran publik,
// dan pengamanan yang sesungguhnya tetap berada di sisi server (token diperiksa di sana,
// dan token tulis berbeda dari token ekspor).
const CFG_KEY = 'cognokids_backend_v1';

export function getBackendConfig() {
  try {
    const raw = localStorage.getItem(CFG_KEY);
    const c = raw ? JSON.parse(raw) : {};
    return { baseUrl: c.baseUrl || APP.baseUrl || '', token: c.token || '' };
  } catch {
    return { baseUrl: APP.baseUrl || '', token: '' };
  }
}

export function setBackendConfig({ baseUrl, token }) {
  try {
    localStorage.setItem(CFG_KEY, JSON.stringify({
      baseUrl: String(baseUrl || '').trim().replace(/\/$/, ''),
      token: String(token || '').trim(),
    }));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e?.name || e) };
  }
}

const loadQueue = () => {
  try { return JSON.parse(localStorage.getItem(APP.queueKey) || '[]'); } catch { return []; }
};
const saveQueue = (q) => {
  try { localStorage.setItem(APP.queueKey, JSON.stringify(q)); } catch {}
  listeners.forEach((fn) => fn(q.length));
};

const listeners = new Set();

async function rawFetch(path, options = {}) {
  const { baseUrl, token } = getBackendConfig();
  if (!baseUrl) throw new Error('backend belum dikonfigurasi');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), APP.fetchTimeout);
  try {
    const res = await fetch(baseUrl + path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'X-CognoKids-Token': token } : {}),
        ...(options.headers || {}),
      },
      signal: ctrl.signal,
    });
    // Inilah baris yang tidak ada di v2.1.
    if (!res.ok) throw new Error(`http ${res.status}`);
    const body = await res.json();
    if (body && body.ok === false) throw new Error(body.error || 'server menolak');
    return body;
  } finally {
    clearTimeout(timer);
  }
}

export const Api = {
  configured: () => !!getBackendConfig().baseUrl,
  online: () => !!getBackendConfig().baseUrl && navigator.onLine,
  queueDepth: () => loadQueue().length,
  onQueueChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },

  /**
   * Kirim satu sesi. Mengembalikan { ok, queued, error } — TIDAK PERNAH melempar,
   * dan tidak pernah mengembalikan ok:true tanpa balasan server.
   */
  async sendSession(entry) {
    try {
      await rawFetch('/sessions', { method: 'POST', body: JSON.stringify(entry) });
      return { ok: true, queued: false };
    } catch (e) {
      const q = loadQueue();
      q.push({ path: '/sessions', method: 'POST', body: entry, ts: Date.now() });
      saveQueue(q);
      return { ok: false, queued: true, error: String(e.message || e) };
    }
  },

  /** Coba kirim ulang antrean. Mengembalikan jumlah yang berhasil dan yang tersisa. */
  async flush() {
    if (!this.online()) return { sent: 0, remaining: loadQueue().length };
    const q = loadQueue();
    const remaining = [];
    let sent = 0;
    for (const item of q) {
      try {
        await rawFetch(item.path, { method: item.method, body: JSON.stringify(item.body) });
        sent += 1;
      } catch {
        remaining.push(item);
      }
    }
    saveQueue(remaining);
    return { sent, remaining: remaining.length };
  },
};

window.addEventListener('online', () => Api.flush());
