// ================= background rain =================
const RS = 16;
let rain = [];
function buildRain() {
  const n = Math.ceil(W / RS) + 3, rows = Math.ceil(H / RS) + 2;
  rain = Array.from({ length: n }, () => ({ y: rand(-30, rows), v: rand(5, 13), len: rand(8, 26) | 0, chars: Array.from({ length: rows }, pick) }));
}
function drawRain(dt, danger) {
  const rows = Math.ceil(H / RS) + 2, n = rain.length;
  const px = cam.x * 0.3, shift = Math.floor(px / RS), off = px - shift * RS;
  ctx.font = `${RS}px ${FONT}`; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  ctx.fillStyle = danger > 0 ? `rgb(${Math.round(255 * danger)},${Math.round(255 - 200 * danger)},${Math.round(106 - 30 * danger)})` : GREEN;
  for (let i = 0; i < n; i++) {
    const s = rain[((i + shift) % n + n) % n];
    s.y += s.v * dt;
    if (s.y - s.len > rows) { s.y = -rand(0, 20); s.v = rand(5, 13); s.len = rand(8, 26) | 0; }
    if (Math.random() < 0.05) s.chars[(Math.random() * rows) | 0] = pick();
    const x = i * RS - off, head = Math.floor(s.y);
    for (let j = 0; j < s.len; j++) {
      const r = head - j; if (r < 0 || r >= rows) continue;
      ctx.globalAlpha = (j === 0 ? 0.55 : 0.26 * (1 - j / s.len)) * (CL && state === 'play' ? 0.5 : 1);
      ctx.fillText(s.chars[r], x, r * RS);
    }
  }
  ctx.globalAlpha = 1;
}

