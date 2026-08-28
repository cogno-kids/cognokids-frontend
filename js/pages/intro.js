// pages/intro.js — layar pembuka tiap mini-game.
//
// Cacat §7.2 v2.1: bilah atas tiap game memuat badge "EK1".."EK4". Di sini hanya nama
// yang dikenal anak. Pemetaan dimensinya hidup di config.js dan tak pernah dirender.

import { escapeHtml } from '../util.js';
import { Store } from '../store.js';

export function renderIntro(app, { game, onStart }) {
  const s = Store.get();
  const ke = s.cursor.index + 1;
  const total = s.gameOrder.length;

  app.innerHTML = `
    <div class="topbar">
      <span style="font-size:22px" aria-hidden="true">${game.emoji}</span>
      <div style="flex:1">
        <h1>${escapeHtml(game.childName)}</h1>
        <div class="sub">Permainan ${ke} dari ${total}</div>
      </div>
    </div>
    <div class="progress"><i style="width:${Math.round(Store.progress() * 100)}%"></i></div>
    <div class="screen">
      <div class="card center">
        <div style="font-size:64px" aria-hidden="true">${game.emoji}</div>
        <h2 style="margin-top:10px">${escapeHtml(game.childName)}</h2>
        <p class="muted" style="margin-top:12px;font-size:16px">${escapeHtml(game.intro)}</p>
      </div>
      <div class="card">
        <p class="muted" style="font-size:14.5px">
          💙 Santai saja ya.<br>
          <b>Tidak ada yang benar atau salah.</b>
        </p>
      </div>
      <button class="btn btn-primary" id="i-go">Ayo main! →</button>
    </div>`;

  app.querySelector('#i-go').addEventListener('click', onStart);
}
