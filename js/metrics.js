// metrics.js — MODUL MURNI. Menurunkan variabel analisis dari catatan per-trial.
//
// Cacat P0 3.4 v2.1: tiga dari lima variabel objektif praktis tanpa varians (FT_skor selalu
// 8, MV_pasang selalu 7, MM_akurasi sering 100), sementara variabel yang sebenarnya
// membedakan anak — waktu reaksi tiap trial, jumlah salah, jeda antar langkah — sudah
// dikumpulkan aplikasi lalu dibuang sebelum diekspor.
//
// Semua fungsi di sini murni: masukan → keluaran, tanpa DOM/waktu/acak.

// ── Statistik dasar ──────────────────────────────────────────────────────────
export const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function sd(xs) {
  if (xs.length < 2) return null;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}

export function median(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// ── Probit: invers CDF normal baku (Acklam) ──────────────────────────────────
// Dibutuhkan untuk d′. Galat relatif < 1,15e-9 pada rentang yang kita pakai.
export function probit(p) {
  if (!(p > 0 && p < 1)) throw new RangeError(`probit butuh 0 < p < 1, diterima: ${p}`);
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
             1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
             6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
             -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00,
             3.754408661907416e+00];
  const pLow = 0.02425, pHigh = 1 - pLow;
  let q, r;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
           ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
  if (p > pHigh) {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
            ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
  q = p - 0.5; r = q * q;
  return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q /
         (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
}

/**
 * d′ dengan koreksi loglinear (Hautus, 1995) — menambah 0,5 pada hit & false alarm dan
 * 1 pada jumlah percobaan, agar tingkat 0% dan 100% tidak menghasilkan tak-hingga.
 * Ini yang membuat akurasi Memory Maze bisa dianalisis meski anak menekan banyak pilihan.
 */
export function dPrime({ hits, falseAlarms, nSignal, nNoise }) {
  if (nSignal <= 0 || nNoise <= 0) return null;
  const H = (hits + 0.5) / (nSignal + 1);
  const F = (falseAlarms + 0.5) / (nNoise + 1);
  return probit(H) - probit(F);
}

// ── Memory Maze ──────────────────────────────────────────────────────────────
/**
 * Menilai satu babak sebagai deteksi sinyal — hit dan false alarm disimpan TERPISAH.
 * v2.1 hanya menyimpan `benar / jumlah target`, tanpa penalti dan tanpa batas pilihan,
 * sehingga akurasi 100% bisa diraih dengan menekan semua gambar (cacat P0 3.3).
 */
export function scoreMemoryRound({ selected, targets, nOptions }) {
  const tset = new Set(targets);
  const hits = selected.filter((x) => tset.has(x)).length;
  const falseAlarms = selected.length - hits;
  return {
    hits,
    falseAlarms,
    nSignal: targets.length,
    nNoise: nOptions - targets.length,
    // Dipertahankan agar sebanding dengan data v2.1, TAPI bukan ukuran utama.
    accuracy: targets.length ? (hits / targets.length) * 100 : null,
  };
}

export function summarizeMemoryMaze(trials) {
  if (!trials.length) return null;
  const hits = trials.reduce((a, t) => a + t.hits, 0);
  const falseAlarms = trials.reduce((a, t) => a + t.falseAlarms, 0);
  const nSignal = trials.reduce((a, t) => a + t.nSignal, 0);
  const nNoise = trials.reduce((a, t) => a + t.nNoise, 0);
  const rts = trials.map((t) => t.rtMs).filter(Number.isFinite);
  return {
    hits, falseAlarms, nSignal, nNoise,
    dPrime: dPrime({ hits, falseAlarms, nSignal, nNoise }),
    accuracy: nSignal ? (hits / nSignal) * 100 : null,
    meanRtMs: mean(rts), sdRtMs: sd(rts),
  };
}

// ── Focus Tower ──────────────────────────────────────────────────────────────
/**
 * Ukuran EK3 yang sesungguhnya: selisih waktu reaksi SEBELUM dan SESUDAH distraktor
 * muncul. `FT_skor` selalu 8 karena game berhenti tepat di situ — tanpa varians sama
 * sekali. Biaya distraksi inilah yang membedakan anak.
 */
export function summarizeFocusTower(trials) {
  if (!trials.length) return null;
  const ok = (t) => Number.isFinite(t.rtMs);
  const pre = trials.filter((t) => !t.distractorPresent && ok(t)).map((t) => t.rtMs);
  const post = trials.filter((t) => t.distractorPresent && ok(t)).map((t) => t.rtMs);
  const all = trials.filter(ok).map((t) => t.rtMs);
  const mPre = mean(pre), mPost = mean(post);
  return {
    score: trials.filter((t) => t.correct).length,
    wrongs: trials.filter((t) => t.correct === false).length,
    clicks: trials.length,
    distractorClicks: trials.filter((t) => t.distractorClicked).length,
    meanRtMs: mean(all), sdRtMs: sd(all),
    meanRtPreMs: mPre, meanRtPostMs: mPost,
    // Positif = anak melambat saat ada gangguan. Inilah biaya distraksi.
    distractionCostMs: mPre !== null && mPost !== null ? mPost - mPre : null,
    nPre: pre.length, nPost: post.length,
  };
}

// ── Puzzle Emosi ─────────────────────────────────────────────────────────────
/**
 * `optimalMoves` adalah jarak solusi papan awal. Menyimpannya menjadikan kesulitan papan
 * kovariat yang bisa dikontrol — v2.1 membangkitkan papan dengan jarak 2–24 langkah
 * sehingga variasi itu masuk ke data sebagai derau (cacat 6.3).
 */
export function summarizePuzzle(trials, { optimalMoves, timeMs, stressClicks, stressTimesMs, hints, solved }) {
  const hes = trials.map((t) => t.rtMs).filter(Number.isFinite);
  const moves = trials.length;
  return {
    moves, optimalMoves, solved: !!solved,
    efficiency: moves > 0 && optimalMoves > 0 ? optimalMoves / moves : null,
    timeMs,
    meanHesitationMs: mean(hes), medianHesitationMs: median(hes), sdHesitationMs: sd(hes),
    stressClicks, stressTimesMs, hints,
  };
}

// ── Move & Match ─────────────────────────────────────────────────────────────
/**
 * `touchCount` dan `dragPx` adalah indikator objektif Physical Demand yang dideklarasikan
 * proposal (Tabel 2.2: "jumlah sentuhan & gerakan layar") tetapi tak pernah dikumpulkan
 * v2.1 — sehingga EK4 sepenuhnya bersandar pada V3, item tunggal.
 */
export function summarizeMoveMatch(trials, { touchCount, dragPx }) {
  const rts = trials.map((t) => t.rtMs).filter(Number.isFinite);
  return {
    pairs: trials.filter((t) => t.matched).length,
    errors: trials.filter((t) => t.matched === false).length,
    attempts: trials.length,
    touchCount, dragPx,
    meanRtMs: mean(rts), sdRtMs: sd(rts),
  };
}
