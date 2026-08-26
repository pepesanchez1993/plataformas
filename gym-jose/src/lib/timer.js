// Temporizador de descanso flotante con cuenta atrás, vibración y aviso sonoro.
// Configurable por ejercicio (segundos). Funciona 100% offline.

import { el, toast } from './ui.js';

let host = null;
let interval = null;
let remaining = 0;
let total = 0;

function ensureHost() {
  if (host) return host;
  host = el('div', { id: 'rest-timer', class: 'rest-timer', role: 'timer', 'aria-live': 'polite' });
  document.body.append(host);
  return host;
}

function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 880; o.type = 'sine';
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    o.start(); o.stop(ctx.currentTime + 0.5);
  } catch { /* audio no disponible */ }
}

function fmt(s) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function paint() {
  const h = ensureHost();
  const pct = total ? (remaining / total) * 100 : 0;
  h.innerHTML = '';
  h.append(
    el('div', { class: 'rest-timer__ring', style: `--pct:${pct}` }, [
      el('span', { class: 'rest-timer__time' }, fmt(remaining)),
    ]),
    el('div', { class: 'rest-timer__ctrls' }, [
      el('button', { class: 'chip-btn', onClick: () => add(-15), 'aria-label': 'Quitar 15s' }, '−15'),
      el('button', { class: 'chip-btn', onClick: () => add(15), 'aria-label': 'Sumar 15s' }, '+15'),
      el('button', { class: 'chip-btn chip-btn--stop', onClick: stop, 'aria-label': 'Parar' }, '✕'),
    ]),
  );
  h.classList.add('is-on');
}

function tick() {
  remaining -= 1;
  if (remaining <= 0) {
    remaining = 0;
    paint();
    finish();
    return;
  }
  paint();
}

function finish() {
  clearInterval(interval);
  interval = null;
  beep();
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  toast('¡Descanso terminado!', 'ok');
  setTimeout(() => { if (host) host.classList.remove('is-on'); }, 1500);
}

function add(delta) {
  remaining = Math.max(1, remaining + delta);
  total = Math.max(total, remaining);
  paint();
}

export function startRestTimer(seconds = 90) {
  if (!seconds || seconds < 1) return;
  clearInterval(interval);
  remaining = Math.round(seconds);
  total = remaining;
  paint();
  interval = setInterval(tick, 1000);
}

export function stop() {
  clearInterval(interval);
  interval = null;
  if (host) host.classList.remove('is-on');
}
