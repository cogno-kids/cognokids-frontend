// router.js — navigasi berbasis keadaan (bukan hash).
//
// Berbeda dari ViaMath yang memakai hash: di alat ukur, anak TIDAK BOLEH bisa melompat
// antar layar lewat URL atau tombol kembali peramban — itu merusak urutan pengukuran.
// Layar ditentukan sepenuhnya oleh kursor di store.

const screens = {};
let current = null;

export const Router = {
  register(id, renderFn) { screens[id] = renderFn; },
  current: () => current,

  show(id) {
    const app = document.getElementById('app');
    if (!app || !screens[id]) return;
    current = id;
    app.innerHTML = '';
    screens[id](app);
    app.scrollTop = 0;
  },
};
