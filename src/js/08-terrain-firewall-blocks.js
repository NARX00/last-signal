// ================= terrain: firewall blocks =================
// The world is split into 640px chunks; each chunk gets 0-2 blocks from a seeded hash, so the map is endless,
// costs nothing to store, and a daily run can share one layout. The starting area stays clear.
const OBS = 640, obCache = new Map();
function hash3(a, b, c) { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return () => { h = Math.imul(h ^ (h >>> 15), 2246822519) + 0x6d2b79f5 | 0; h = Math.imul(h ^ (h >>> 13), 3266489917); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; }
function blocksAt(cx, cy) {
  const k = cx * 100003 + cy;
  let b = obCache.get(k); if (b) return b;
  b = [];
  if (Math.abs(cx) + Math.abs(cy) > 0) {
    const r = hash3(cx, cy, G ? G.seed : 1), n = r() < 0.3 ? 0 : r() < 0.6 ? 1 : 2, x0 = cx * OBS - OBS / 2, y0 = cy * OBS - OBS / 2;
    for (let i = 0; i < n; i++) {
      const kind = r(); let w, h;
      if (kind < 0.4) { w = 34; h = 150 + r() * 120; if (r() < 0.5) [w, h] = [h, w]; }   // bar
      else if (kind < 0.8) { w = h = 80 + r() * 70; }                                     // block
      else { w = 170 + r() * 60; h = 34; }                                                // long wall
      const x = x0 + 70 + r() * (OBS - 140 - w), y = y0 + 70 + r() * (OBS - 140 - h);
      b.push({ x, y, w, h, g: Array.from({ length: 6 }, pick).join('') });
    }
  }
  if (obCache.size > 600) obCache.clear();
  obCache.set(k, b); return b;
}
function eachBlockNear(x, y, R, fn) {
  const c0x = Math.floor((x - R + OBS / 2) / OBS), c1x = Math.floor((x + R + OBS / 2) / OBS), c0y = Math.floor((y - R + OBS / 2) / OBS), c1y = Math.floor((y + R + OBS / 2) / OBS);
  for (let cx = c0x; cx <= c1x; cx++) for (let cy = c0y; cy <= c1y; cy++) for (const b of blocksAt(cx, cy)) fn(b);
  if (G && G.tblocks.length) for (const b of G.tblocks) fn(b);
}
// push a circle out of any block it overlaps; returns true if it hit something
function pushOut(o, r) {
  let hit = false;
  eachBlockNear(o.x, o.y, r, b => {
    const nx = clamp(o.x, b.x, b.x + b.w), ny = clamp(o.y, b.y, b.y + b.h), dx = o.x - nx, dy = o.y - ny, d2 = dx * dx + dy * dy;
    if (d2 >= r * r) return;
    hit = true;
    if (d2 > 0.0001) { const d = Math.sqrt(d2); o.x = nx + dx / d * r; o.y = ny + dy / d * r; }
    else { // centre inside: leave by the shortest side
      const l = o.x - b.x, rr = b.x + b.w - o.x, t = o.y - b.y, bt = b.y + b.h - o.y, m = Math.min(l, rr, t, bt);
      if (m === l) o.x = b.x - r; else if (m === rr) o.x = b.x + b.w + r; else if (m === t) o.y = b.y - r; else o.y = b.y + b.h + r;
    }
  });
  return hit;
}
const inBlock = (x, y) => { let h = false; eachBlockNear(x, y, 0, b => { if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) h = true; }); return h; };

