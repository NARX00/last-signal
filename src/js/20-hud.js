// ================= HUD =================
let lastHud = {};
function updateHud(force) {
  const sec = G.sector ? SECTORS[G.sector].name : 'Outer network';
  const relics = Object.keys(G.relics || {}).map(id=>BOSS_RELICS[id].name);
  setTxt($('sectorReadout'), sec + (relics.length ? ' · '+relics.length+' boss abilit'+(relics.length===1?'y':'ies')+' · Pause for details' : ['full','short'].includes(G.mode) && G.gate >= 1 ? ' · Boss victories unlock routes' : ''));
  const hp = Math.ceil(clamp(P.hp / STAT.maxHp, 0, 1) * 100);
  setTxt($('hpReadout'), 'INTEGRITY ' + hp + '%');
  setW($('hpFill'), hp + '%');
  { const bg = hp < 30 ? HOT : GREEN, f = $('hpFill'); if (f.dataset.bg !== bg) { f.dataset.bg = bg; f.style.background = bg; } }
  const xpw = (G.xp / G.need * 100).toFixed(1) + '%', tm = fmt(G.t);
  if (force || lastHud.xp !== xpw) { $('xpfill').style.width = xpw; lastHud.xp = xpw; $('xpn').textContent = `${Math.floor(G.xp)} / ${G.need}`; }
  if (force || lastHud.tm !== tm) { $('timer').textContent = tm; lastHud.tm = tm; }
  if (force || lastHud.k !== G.kills) { $('kills').textContent = G.kills; lastHud.k = G.kills; }
  if (force || lastHud.lv !== G.level) { $('lv').textContent = G.level; lastHud.lv = G.level; }
  { const n = state === 'play' ? G.pending : 0; if (force || lastHud.pend !== n) { lastHud.pend = n; const b = $('lvBadge'); b.hidden = !n; b.textContent = '▲ ' + n; } }
  const et = G.exitTxt || G.evtTxt || G.goalTxt || '';
  if (force || lastHud.ev !== et) { lastHud.ev = et; const el = $('evt'); el.hidden = !et; el.textContent = et; }
  const th = G.threat.toFixed(1);
  if (force || lastHud.th !== th) { lastHud.th = th; const el = $('threat'); el.hidden = G.threat < 1.1; el.textContent = 'Threat ×' + th; el.classList.toggle('hot', G.threat >= 1.6); }
  if (G.boss) $('bossfill').style.width = clamp(G.boss.hp / G.boss.max * 100, 0, 100) + '%';
}
function slotEl(id, kind) {
  const isW = kind === 'w', D = isW ? WDEF[id] : PDEF[id], lvl = isW ? P.W[id].lvl : P.Pv[id], max = isW ? WMAX : PMAX;
  const evo = isW && P.evo[id], ready = isW && evoReady(id);
  const el = document.createElement('div');
  el.className = 'slot' + (isW ? '' : ' passive') + (lvl >= max ? ' max' : '') + (evo ? ' evo' : '') + (ready ? ' ready' : '');
  el.title = evo ? EVO[id].name : D.name + (ready ? ' · ready to evolve, find a Cache' : '');
  const ic = document.createElement('span'); ic.className = 'ic'; setIcon(ic, id, D.icon);
  el.appendChild(ic);
  if (evo) { const s = document.createElement('span'); s.className = 'star'; s.textContent = '★ ' + EVO[id].name; el.appendChild(s); }
  else { const pips = document.createElement('span'); pips.className = 'pips'; for (let i = 0; i < max; i++) { const p = document.createElement('i'); if (i < lvl) p.className = 'on'; pips.appendChild(p); } el.appendChild(pips); }
  if (isW && P.code[id] && P.code[id].length) { const c = document.createElement('span'); c.className = 'cl'; c.textContent = `{${P.code[id].length}}`; el.appendChild(c); el.title += ' · ' + P.code[id].map(lineTxt).join(' · '); }
  return el;
}
function renderSlots(target) {
  const el = target || $('slots'); el.textContent = '';
  for (const id in P.W) el.appendChild(slotEl(id, 'w'));
  for (const id in P.Pv) el.appendChild(slotEl(id, 'p'));
}

