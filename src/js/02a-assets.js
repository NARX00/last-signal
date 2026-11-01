// ================= assets: optional sprites, icons and music files =================
// Everything here is optional. When a file exists in assets/, the game uses it; when it doesn't, the game draws and
// plays exactly what it always has. tools/build.py fills BUILD.assets from the assets/ folder.
const ASSETS = Object.assign({ sprites: {}, icons: {}, music: {} }, BUILD.assets);
const SPRITE_OPTS = BUILD.data.sprites || {};      // data/sprites.json: per-sprite { scale, rotate }
const SPR = {};
for (const [id, url] of Object.entries(ASSETS.sprites)) { const im = new Image(); im.decoding = 'async'; im.src = url; SPR[id] = im; }
const sprReady = id => { const im = SPR[id]; return im && im.complete && im.naturalWidth > 0 ? im : null; };
// Regular enemies whose drawn look carries no warning can be replaced by a sprite. Lancers, Watchers, Eels, Ghosts and
// bosses keep their drawn look, because it shows aim lines, segments or visibility the player has to read.
const SPRITE_OK = new Set(['bug', 'daemon', 'drone', 'split', 'brute', 'leaker', 'warden', 'patcher', 'scrubber']);
// Enemies defined only in data/enemies.json (they have a "spawn" block) chase the player with the standard movement
const CUSTOM_ENEMIES = Object.entries(BUILD.data.enemies).filter(([, d]) => d.spawn);
function drawSprite(im, size, flash) {
  const w = im.naturalWidth, h = im.naturalHeight, k = size / Math.max(w, h);
  ctx.drawImage(im, -w * k / 2, -h * k / 2, w * k, h * k);
  if (flash) { const g = ctx.globalCompositeOperation; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(im, -w * k / 2, -h * k / 2, w * k, h * k); ctx.globalCompositeOperation = g; }
}
function drawEnemySprite(e, im, fl, t) {
  const o = SPRITE_OPTS[e.type] || {};
  ctx.save();
  if (o.rotate === 'face') ctx.rotate(Math.atan2(P.y - e.y, P.x - e.x)); else if (o.rotate === 'spin') ctx.rotate(t * 2 + e.ph);
  drawSprite(im, e.r * 2.4 * (o.scale || 1), fl);
  ctx.restore();
  // keep the readouts that matter for play on top of the art
  if (e.type === 'warden' && wardenGuard(e)) { ctx.strokeStyle = '#81d9ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, e.r + 6, -Math.PI * .85, Math.PI * .85); ctx.stroke(); }
  if (e.type === 'patcher' && e.patch) { ctx.font = `11px ${FONT}`; ctx.fillStyle = AMBER; ctx.fillText('-' + FX[e.patch].fn + '()', 0, -e.r - 10); }
}
function drawCustomEnemy(e, fl, slowed) {
  const L = BUILD.data.enemies[e.type].look || {}, col = fl ? '#ffffff' : slowed ? '#c49cff' : (L.color || '#ff9f40'), r = e.r;
  ctx.fillStyle = 'rgba(24,8,0,.85)'; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath();
  if (L.shape === 'square') ctx.rect(-r, -r, r * 2, r * 2);
  else if (L.shape === 'diamond') { ctx.moveTo(0, -r * 1.2); ctx.lineTo(r * 1.2, 0); ctx.lineTo(0, r * 1.2); ctx.lineTo(-r * 1.2, 0); ctx.closePath(); }
  else if (L.shape === 'triangle') { ctx.moveTo(0, -r * 1.2); ctx.lineTo(r * 1.1, r * .8); ctx.lineTo(-r * 1.1, r * .8); ctx.closePath(); }
  else ctx.arc(0, 0, r, 0, TAU);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = col; ctx.font = `${Math.max(10, Math.round(r * 1.1))}px ${FONT}`; ctx.fillText(L.glyph || e.ch, 0, 1);
}
// Weapon, system and power icons: an image from assets/icons/<id>.png when there is one, otherwise the glyph
function setIcon(el, id, glyph) {
  const url = id && ASSETS.icons[id];
  if (!url) { el.textContent = glyph; return; }
  el.textContent = ''; const im = document.createElement('img'); im.src = url; im.alt = ''; im.className = 'icimg'; el.appendChild(im);
}
