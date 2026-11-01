// ================= operator support =================
// The Relay doubles as your operator: a third button charges over time (faster as you collect shards).
const OPCALL = {
  supply:  { icon: '✚', name: 'Supply drop', desc: 'Restores 40% integrity and your shield, and drops a spread of shards around you.' },
  rewrite: { icon: '▦', name: 'Rewrite',     desc: 'Four firewall walls form around you for 12 seconds. Enemies have to come through the corners.' },
  trace:   { icon: '⌖', name: 'Trace',       desc: 'Pulls in every shard on the map and marks Cache carriers and caches for 30 seconds.' },
  strike:  { icon: 'ϟ', name: 'Override',    desc: 'Lightning hits the 10 toughest enemies on screen hard, and takes 10% off a boss.' }
};
function opReady() { const b = $('opBtn'); if (b) { b.classList.remove('ready'); void b.offsetWidth; b.classList.add('ready'); } relay(RELAY.operator.ready); sfx.pickup(); }
function callOperator() {
  if (state !== 'play' || !G || G.opCharge < 100 || G.ending) return;
  state = 'opcall'; sfx.level();
  const wrap = $('opCards'); wrap.textContent = '';
  Object.keys(OPCALL).forEach((id, i) => {
    const D = OPCALL[id], b = document.createElement('button'); b.type = 'button'; b.className = 'card';
    const top = document.createElement('div'); top.className = 'top';
    const ic = document.createElement('span'); ic.className = 'ic'; ic.textContent = D.icon; top.appendChild(ic);
    const body = document.createElement('div'); body.style.cssText = 'display:flex;flex-direction:column;gap:6px;min-width:0';
    const kd = document.createElement('span'); kd.className = 'kind'; kd.textContent = 'Operator';
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = D.name;
    const ds = document.createElement('span'); ds.className = 'ds'; ds.textContent = D.desc;
    body.append(kd, nm, ds);
    const key = document.createElement('span'); key.className = 'key'; key.textContent = 'Press ' + (i + 1);
    b.append(top, body, key); b.addEventListener('click', () => opChoose(id)); wrap.appendChild(b);
  });
  $('opcall').hidden = false;
  setTimeout(() => { const f = wrap.querySelector('button'); if (f) f.focus({ preventScroll: true }); }, 30);
}
function opChoose(id) {
  if (state !== 'opcall') return;
  G.opCharge = 0; G.opCalls++; $('opcall').hidden = true; state = 'play'; last = performance.now();
  if (id === 'supply') {
    P.hp = Math.min(STAT.maxHp, P.hp + STAT.maxHp * 0.4); P.sh = STAT.shieldMax;
    const v = G.need * 0.18 / 10; for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; dropGem(P.x + Math.cos(a) * 70, P.y + Math.sin(a) * 70, v); }
    rings.push({ x: P.x, y: P.y, r: 0, max: 140, w: 14, dmg: 0, hit: new Set(), t: 0, col: '#c8ffe0', follow: true });
    banner('Operator', 'Supply drop', 'gold');
  } else if (id === 'rewrite') {
    const L = 150, T = 26, D = 100, till = G.t + 12;
    G.tblocks = [
      { x: P.x - L / 2, y: P.y - D - T, w: L, h: T }, { x: P.x - L / 2, y: P.y + D, w: L, h: T },
      { x: P.x - D - T, y: P.y - L / 2, w: T, h: L }, { x: P.x + D, y: P.y - L / 2, w: T, h: L }
    ].map(b => Object.assign(b, { till, mine: true, g: Array.from({ length: 6 }, pick).join('') }));
    for (const e of enemies) if (!isB(e)) pushOut(e, e.r);
    shake = Math.max(shake, 6); banner('Operator', 'Rewrite', 'gold');
  } else if (id === 'trace') {
    G.traceT = G.t + 30; gems.forEach(g => g.mag = true);
    banner('Operator', 'Trace', 'gold');
  } else {
    // Override: heavy strikes on the biggest threats in view
    DSRC = 'power';
    const inView = enemies.filter(e => !e.dead && Math.abs(e.x - P.x) < VW / 2 && Math.abs(e.y - P.y) < VH / 2);
    const boss = inView.find(isB); if (boss) { strike(boss, 0); hurt(boss, boss.max * 0.1); }
    inView.filter(e => !isB(e)).sort((a, b) => b.hp - a.hp).slice(0, 10).forEach((e, k) => setTimeout(() => { if (!e.dead && G) { DSRC = 'power'; strike(e, Math.max(120, e.max * 0.6)); DSRC = 'other'; } }, k * 60));
    DSRC = 'other'; shake = Math.max(shake, 10); banner('Operator', 'Override', 'gold');
  }
  relay(RELAY.operator[id]); sfx.evolve();
}
function updateOpBtn() {
  const b = $('opBtn'); if (!b || !G) return;
  if (b.hidden !== (G.gate < 1)) b.hidden = G.gate < 1;
  const f = 1 - G.opCharge / 100;
  b.style.setProperty('--p', f.toFixed(3)); b.classList.toggle('cool', G.opCharge < 100);
  const sec = b.querySelector('.sec'), txt = G.opCharge < 100 ? Math.floor(G.opCharge) + '%' : '';
  if (sec.textContent !== txt) sec.textContent = txt;
}
function renderPowers() {
  const box = $('powers'); box.textContent = '';
  if (!G) return;
  G.pw.forEach((p, i) => {
    const D = XDEF[p.id];
    const b = document.createElement('button'); b.type = 'button'; b.className = 'pw'; b.id = 'pw' + i;
    b.setAttribute('aria-label', `${D.name}, level ${P.xl[p.id] || 1}. Key ${i ? 'E' : 'Q'}.`);
    const ic = document.createElement('span'); ic.className = 'ic'; setIcon(ic, p.id, D.icon);
    const sec = document.createElement('span'); sec.className = 'sec';
    const key = document.createElement('span'); key.className = 'key'; key.textContent = i ? 'E' : 'Q';
    b.append(ic, sec, key);
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); usePower(i); });
    box.appendChild(b);
  });
  const ob = document.createElement('button'); ob.type = 'button'; ob.className = 'pw op'; ob.id = 'opBtn'; ob.setAttribute('aria-label', 'Call your operator. Key F.');
  const oi = document.createElement('span'); oi.className = 'ic'; oi.textContent = '◬';
  const os = document.createElement('span'); os.className = 'sec';
  const ok2 = document.createElement('span'); ok2.className = 'key'; ok2.textContent = 'F';
  ob.append(oi, os, ok2); ob.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); callOperator(); });
  box.prepend(ob);
  if (G.core) { const tb = document.createElement('button'); tb.type = 'button'; tb.className = 'pw op'; tb.id = 'turBtn'; tb.setAttribute('aria-label', 'Build a turret. Key T.'); const ti = document.createElement('span'); ti.className = 'ic'; ti.textContent = '▲'; const tk = document.createElement('span'); tk.className = 'key'; tk.textContent = 'T'; tb.append(ti, tk); tb.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); placeTurret(); }); box.prepend(tb); }
  $('trainbar').hidden = !G.training;
  updatePowers();
}
function updatePowers() {
  if (!G) return;
  G.pw.forEach((p, i) => {
    const el = $('pw' + i); if (!el) return;
    const f = p.cd > 0 ? clamp(p.cd / (p.max || 1), 0, 1) : 0;
    el.style.setProperty('--p', f.toFixed(3));
    el.classList.toggle('cool', p.cd > 0);
    const sec = el.querySelector('.sec'), txt = p.cd > 0 ? String(Math.ceil(p.cd)) : '';
    if (sec.textContent !== txt) sec.textContent = txt;
  });
}

