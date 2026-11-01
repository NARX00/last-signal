// ================= feedback =================
let bannerT = 0;
function banner(k, t, cls = '') {
  const b = $('banner'); $('bannerK').textContent = k; $('bannerT').textContent = t;
  b.className = 'banner show ' + cls; clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove('show'), 2200);
}
function addText(x, y, v, crit) { if (texts.length > 70) texts.shift(); texts.push({ x: x + rand(-6, 6), y, v, crit, t: 0 }); }
function burst(x, y, n, col, spd = 160) {
  n = Math.ceil(n * [1, 0.6, 0.3][QL]);
  for (let i = 0; i < n; i++) { const a = rand(0, TAU), v = rand(30, spd); sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, ch: pick(), t: 0, life: rand(0.3, 0.7), col }); }
  const cap = [320, 160, 70][QL]; if (sparks.length > cap) sparks.splice(0, sparks.length - cap);
}

