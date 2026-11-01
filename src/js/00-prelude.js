(() => {
'use strict';
/*@@BUILD_DATA@@*/
const $ = id => document.getElementById(id);
const cv = $('c'), ctx = cv.getContext('2d');
// on the lowest quality, soft shadows (the most expensive canvas effect) are skipped everywhere
(() => { const d = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'shadowBlur'); if (d && d.set) Object.defineProperty(ctx, 'shadowBlur', { get() { return d.get.call(this); }, set(v) { d.set.call(this, QL >= 2 ? 0 : v); } }); })();
let hitStop = 0, DSRC = 'other', CODE_L = null;
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FONT = '"Share Tech Mono", monospace';
let GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789';
const pick = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];
const use = n => (window.claude && typeof window.claude.use === 'function') ? window.claude.use(n).catch(() => null) : Promise.resolve(null);
const fmt = s => { s = Math.max(0, Math.floor(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
const GREEN = '#00ff6a', HOT = '#ff3b5c', AMBER = '#ffb000', CYAN = '#7ff7ff', ORANGE = '#ff7a3b';
const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v && typeof v === 'object' ? Object.assign(d, v) : d; } catch (_) { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };


{ const hs = $('signalStatus'), qr = $('questReadout'); qr.after(hs); }
const launch = $('startBtn').parentElement;
launch.classList.add('launch-actions');
document.querySelector('.title-grid > div > div').appendChild(launch);
const art = document.createElement('div'); art.className = 'signal-art'; art.setAttribute('aria-hidden','true');
art.innerHTML = `<span class="art-label">RELAY // TRANSMISSION 001</span><svg viewBox="0 0 500 300"><defs><radialGradient id="halo"><stop stop-color="#61f5c0" stop-opacity=".24"/><stop offset="1" stop-color="#61f5c0" stop-opacity="0"/></radialGradient><pattern id="mesh" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25" fill="none" stroke="#89e8eb" stroke-opacity=".08"/></pattern></defs><path fill="url(#mesh)" d="M0 0h500v300H0z"/><circle cx="250" cy="145" r="135" fill="url(#halo)"/><g fill="none" stroke="#61f5c0"><circle cx="250" cy="145" r="94" opacity=".2"/><circle cx="250" cy="145" r="120" stroke-dasharray="2 13" opacity=".3"/><g class="orbital"><path d="M156 145a94 94 0 0 1 94-94M250 239a94 94 0 0 0 94-94" stroke-width="3"/><circle cx="344" cy="145" r="5" fill="#b5ffe6"/></g><path d="M250 90l30 76-30-17-30 17z" fill="#dcfff3" stroke-width="2"/><path d="M242 174l8 23 8-23M250 204v14" opacity=".7"/><path d="M60 190h55l22-22M360 92l24-22h56" opacity=".4"/></g><g fill="#ff637d"><path d="M120 85l7 12-14 0zM379 205l7 12h-14z"/><circle cx="400" cy="130" r="3"/></g></svg><div class="art-bottom"><span>HOSTILE NETWORK</span><b>● SIGNAL FOUND</b></div>`;
document.querySelector('.title-grid > div:nth-child(2)').prepend(art);

