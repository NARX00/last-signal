// ================= level up =================
function offers() {
  const pool = [];
  const nW = Object.keys(P.W).length, nP = Object.keys(P.Pv).length;
  const ok = (k, id) => !G.banned.has(k + id);
  for (const id in WDEF) { const l = P.W[id] ? P.W[id].lvl : 0; if (ok('w', id) && l < WMAX && (l > 0 || nW < WSLOTS)) pool.push({ kind: 'w', id, l, wt: l ? 1.25 : 1.05 }); }
  for (const id in PDEF) {
    const l = P.Pv[id] || 0; if (!ok('p', id) || !(l < PMAX && (l > 0 || nP < PSLOTS))) continue;
    const helps = !l && Object.keys(P.evo).length < evoCap() && Object.keys(EVO).some(w => EVO[w].need === id && P.W[w] && P.W[w].lvl >= WMAX && !P.evo[w]);
    pool.push({ kind: 'p', id, l, wt: helps ? 2.4 : 0.85 });
  }
  for (const p of G.pw) { const l = P.xl[p.id] || 1; if (ok('x', p.id) && l < 3) pool.push({ kind: 'x', id: p.id, l, wt: 0.9 }); }
  pool.push(...codeOffers());
  const out = [];
  while (out.length < 3 && pool.length) {
    const sum = pool.reduce((a, o) => a + o.wt, 0); let r = Math.random() * sum, k = 0;
    for (; k < pool.length; k++) { r -= pool[k].wt; if (r <= 0) break; }
    out.push(pool.splice(Math.min(k, pool.length - 1), 1)[0]);
  }
  const ov = OVER.filter(o => o.id === 'oheal' || (P.ov[o.id] || 0) < OVER_CAP).sort(() => Math.random() - 0.5);
  while (out.length < 3 && ov.length) out.push({ kind: 'o', id: ov.pop().id });
  return out;
}
let curOffers = [];
// A level-up is only worth stopping the game for when it holds a real choice: a new weapon or system, an early weapon
// level, a code piece. Later weapon levels, rank-ups (code line, power, system) and overflow are taken automatically.
const minorOffer = o => o.kind === 'o' || o.kind === 'x' || (o.kind === 'c' && (o.up || o.spare)) || (o.kind === 'p' && o.l > 0 && o.wt < 2) || (o.kind === 'w' && o.l >= 4);
function peekOffers() { return G.peek || (G.peek = offers()); }
function autoPick(peek) {
  // a weapon about to evolve first, then other weapon levels, code, powers, systems, overflow
  const rank = o => o.kind === 'w' ? (o.l + 1 >= WMAX ? 6 : 5) : o.kind === 'c' ? (o.up ? 4 : 2.5) : o.kind === 'x' ? 3 : o.kind === 'p' ? 2 : o.id === 'oheal' ? 0 : 1;
  let o = peek.slice().sort((a, b) => rank(b) - rank(a))[0];
  if (P.hp < STAT.maxHp * 0.4 && peek.every(x => x.kind === 'o')) o = { kind: 'o', id: 'oheal' };
  if (o.kind === 'c' && !o.up) {   // a spare code piece goes to the inventory; it's used from Pause → editor
    if (o.piece === 'k') addPiece('k', o.k); else addPiece(o.piece, o.piece === 't' ? o.t : o.f);
    toast(`▲ ${G.level} · ${o.piece === 'k' ? condTxt(o.k) : o.piece === 't' ? trigTxt(o.t, 0) : FX[o.f].fn + '()'} → ${tr('Code editor')}`); sfx.pickup(); return;
  }
  const name = o.kind === 'w' ? WDEF[o.id].name : o.kind === 'c' ? FX[o.f].name : o.kind === 'x' ? XDEF[o.id].name : o.kind === 'p' ? PDEF[o.id].name : (OVER.find(x => x.id === o.id) || {}).name;
  curOffers = [o]; state = 'level'; choose(0);
  toast(`▲ ${G.level} · ${name} +1`); sfx.pickup();
}
// a real choice waits for a calm moment (nothing close, no shots coming) or for a tap on the ▲ badge; at most 2.5 s
function levelCalm(dt) {
  G.lvWait = (G.lvWait || 0) + dt;
  if (G.training || G.level <= 6 || G.lvWait >= 2.5) return true;
  for (const e of enemies) if (!e.dead && !(e.ally > G.t) && (e.x - P.x) ** 2 + (e.y - P.y) ** 2 < 120 * 120) return false;
  for (const s of eshots) if ((s.x - P.x) ** 2 + (s.y - P.y) ** 2 < 110 * 110) return false;
  return true;
}
function levelTick(dt) {
  if (!(G.pending > 0 && state === 'play')) { if (!G.pending) G.lvWait = 0; return; }
  const peek = peekOffers();
  if (peek.every(minorOffer)) { G.pending--; G.peek = null; autoPick(peek); return; }
  if (levelCalm(dt)) openLevelUp();
}
function openLevelUp() {
  G.pending--; G.lvWait = 0;
  const peek = peekOffers(); G.peek = null;
  if (peek.every(minorOffer)) { autoPick(peek); return; }
  state = 'level'; G.banMode = false;
  if (G.level === 2) relay(RELAY.level[0]);
  sfx.level(); haptic('impact', 'soft', 300);
  curOffers = peek;
  $('lvHead').textContent = 'Level ' + G.level;
  $('lvEyebrow').textContent = curOffers.every(o => o.kind === 'o') ? 'Everything is maxed · overflow' : 'Signal strengthened';
  renderCards();
  $('levelup').hidden = false;
}
function renderCards() {
  const wrap = $('cards'); wrap.textContent = '';
  curOffers.forEach((o, i) => {
    if (o.kind === 'c') { wrap.appendChild(codeCard(o, i)); return; }
    const b = document.createElement('button'); b.type = 'button'; b.className = 'card' + (o.kind === 'p' ? ' passive' : o.kind === 'o' ? ' over' : '');
    let icon, name, kind, tag, tagc = '', desc, ev = '';
    if (o.kind === 'w') {
      const D = WDEF[o.id]; icon = D.icon; name = D.name; kind = 'Weapon'; tag = o.l ? `Lv ${o.l} → ${o.l + 1}` : 'New'; tagc = !o.l ? 'new' : o.l + 1 === WMAX ? 'max' : ''; desc = D.desc[o.l];
      ev = Object.keys(P.evo).length >= evoCap() && !P.evo[o.id] ? `No evolution left this run (${evoCap()} per run).` : `Evolves into ${EVO[o.id].name} with ${PDEF[EVO[o.id].need].name}.`;
    } else if (o.kind === 'p') {
      const D = PDEF[o.id]; icon = D.icon; name = D.name; kind = 'System'; tag = o.l ? `Lv ${o.l} → ${o.l + 1}` : 'New'; tagc = !o.l ? 'new' : ''; desc = D.desc;
      const pair = Object.keys(EVO).find(w => EVO[w].need === o.id); if (pair) ev = `Partner of ${WDEF[pair].name}.`;
    } else if (o.kind === 'x') {
      const D = XDEF[o.id]; icon = D.icon; name = D.name; kind = 'Power'; tag = `Lv ${o.l} → ${o.l + 1}`; tagc = o.l + 1 === 3 ? 'max' : ''; desc = XLV[o.l];
    } else { const D = OVER.find(x => x.id === o.id); icon = D.icon; name = D.name; kind = 'Overflow'; tag = 'Stack ' + ((P.ov[o.id] || 0) + 1); tagc = 'max'; desc = D.desc; }
    const top = document.createElement('div'); top.className = 'top';
    const ic = document.createElement('span'); ic.className = 'ic'; setIcon(ic, o.kind === 'o' ? null : o.id, icon);
    const tg = document.createElement('span'); tg.className = 'tag ' + tagc; tg.textContent = tag;
    top.append(ic, tg);
    const body = document.createElement('div'); body.style.cssText = 'display:flex;flex-direction:column;gap:6px;min-width:0';
    const kd = document.createElement('span'); kd.className = 'kind'; kd.textContent = kind;
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = name;
    const ds = document.createElement('span'); ds.className = 'ds'; ds.textContent = desc;
    body.append(kd, nm, ds);
    const insight = upgradeInsight(o);
    if (insight) { const info=document.createElement('span'); info.className='build-note'; info.textContent=insight; body.appendChild(info); }
    if (ev) { const e2 = document.createElement('span'); e2.className = 'ev'; e2.textContent = '★ ' + ev; body.appendChild(e2); }
    const key = document.createElement('span'); key.className = 'key'; key.textContent = 'Press ' + (i + 1);
    b.append(top, body, key);
    b.addEventListener('click', () => G.banMode ? banishCard(i) : choose(i));
    wrap.appendChild(b);
  });
  const rb = $('rerollBtn'); rb.textContent = `Reroll (${G.rerolls})`; rb.disabled = G.rerolls <= 0; rb.hidden = (META.ranks.reroll || 0) === 0;
  const bb = $('banishBtn'); bb.textContent = `Banish (${G.banish})`; bb.disabled = G.banish <= 0; bb.hidden = !(META.ranks.banish > 0); bb.setAttribute('aria-pressed', G.banMode);
  $('skipBtn').hidden = !META.ranks.skip;
  wrap.classList.toggle('banishing', G.banMode); $('banishNote').hidden = !G.banMode;
  setTimeout(() => { const f = wrap.querySelector('button'); if (f) f.focus({ preventScroll: true }); }, 30);
}
// ---- code cards and the install picker ----
function cardEl({ icon, tag, tagc, kind, name, desc, code, key, cls }, onClick) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'card ' + (cls || '');
  const top = document.createElement('div'); top.className = 'top';
  const ic = document.createElement('span'); ic.className = 'ic'; ic.textContent = icon;
  const tg = document.createElement('span'); tg.className = 'tag ' + (tagc || ''); tg.textContent = tag;
  top.append(ic, tg);
  const body = document.createElement('div'); body.style.cssText = 'display:flex;flex-direction:column;gap:6px;min-width:0';
  const kd = document.createElement('span'); kd.className = 'kind'; kd.textContent = kind;
  const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = name;
  body.append(kd, nm);
  if (code) { const c = document.createElement('span'); c.className = 'code'; c.textContent = code; body.appendChild(c); }
  if (desc) { const ds = document.createElement('span'); ds.className = 'ds'; ds.textContent = desc; body.appendChild(ds); }
  b.append(top, body);
  if (key) { const k = document.createElement('span'); k.className = 'key'; k.textContent = key; b.appendChild(k); }
  b.addEventListener('click', onClick);
  return b;
}
const cap1 = t => t.charAt(0).toUpperCase() + t.slice(1);
function codeCard(o, i) {
  const F = FX[o.f], T = TRIG[o.t], key = 'Press ' + (i + 1), click = () => G.banMode ? banishCard(i) : choose(i);
  if (o.up) {
    const L = { t: o.t, f: o.f, r: o.r + 1 };
    return cardEl({ icon: F.icon, cls: 'codec', kind: 'Code · rank up', name: F.name, tag: `Rank ${o.r + 1} → ${o.r + 2}`, tagc: o.r + 2 === LINE_MAX ? 'max' : '',
      code: wslug(o.id) + '.' + lineTxt(L), desc: lineSay(L) + ` ${L.r > 1 ? 75 : 35}% stronger than rank 1.`, key }, click);
  }
  if (o.piece === 'b') return cardEl({ icon: '{}', cls: 'codec', kind: 'Code · trigger + effect', name: codeLines() ? 'Line kit' : 'First line', tag: '2 pieces', tagc: 'new',
    code: `${trigTxt(o.t, 0)}  +  ${F.fn}()`, desc: `${T.say(0)}: ${F.say(0)}. You'll wire them into a weapon in the editor.`, key }, click);
  if (o.piece === 'k') { const C = COND[o.k]; return cardEl({ icon: '?', cls: 'codec', kind: 'Code · condition', name: 'If ' + C.fn, tag: 'Condition', tagc: 'new',
    code: `… → ${condTxt(o.k)} → …`, desc: `The line runs only ${C.say}, and hits 60% harder. Attach it to any line in the editor.`, key }, click); }
  if (o.piece === 't') return cardEl({ icon: '◉', cls: 'codec', kind: 'Code · trigger', name: cap1(T.fn.replace('_', ' ')), tag: 'Trigger', tagc: 'new',
    code: trigTxt(o.t, 0) + ' → …', desc: `${T.say(0)}. Pair it with any effect in your inventory.`, key }, click);
  return cardEl({ icon: F.icon, cls: 'codec', kind: 'Code · effect', name: F.name, tag: 'Effect', tagc: 'new',
    code: `… → ${F.fn}()`, desc: `${cap1(F.say(0))}. Pair it with any trigger in your inventory.`, key }, click);
}
const fmtN = v => v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e4 ? Math.round(v / 1e3) + 'k' : v >= 1e3 ? (v / 1e3).toFixed(1) + 'k' : String(Math.round(v));
// what one line has done this run, in its own terms
function lineStat(L) {
  const tot = Object.values(G.dmg).reduce((a, b) => a + b, 0) || 1;
  if (L.f === 'leech') return `+${Math.round(L.heal)} repaired`;
  if (L.f === 'shield') return `+${Math.round(L.heal)} shield`;
  if (L.f === 'mark') return `${fmtN(L.marks)} marked`;
  if (L.f === 'freeze') return `${fmtN(L.marks)} slowed` + (L.dmg >= 1 ? ` · ${fmtN(L.dmg)} dmg` : '');
  if (L.f === 'over') return `${fmtN(L.fired)} extra volleys`;
  if (!L.fired) return 'not fired yet';
  return `${fmtN(L.dmg)} dmg · ${(L.dmg / tot * 100).toFixed(L.dmg / tot < 0.1 ? 1 : 0)}%`;
}
function addPiece(k, id) { G.inv[k][id] = (G.inv[k][id] || 0) + 1; }
function takePiece(k, id) { if (!G.inv[k][id]) return false; if (--G.inv[k][id] <= 0) delete G.inv[k][id]; return true; }
function openEditor(from) {
  G.edFrom = from; state = 'editor';
  $('levelup').hidden = true; $('pause').hidden = true; $('editor').hidden = false;
  if (!G.inv.t[G.sel.t]) G.sel.t = Object.keys(G.inv.t)[0] || null;
  if (!G.inv.f[G.sel.f]) G.sel.f = Object.keys(G.inv.f)[0] || null;
  if (!G.inv.k[G.sel.k]) G.sel.k = null;
  renderEditor();
  setTimeout(() => { const f = $('edBody').querySelector('button:not(:disabled)') || $('edDone'); f.focus({ preventScroll: true }); }, 30);
}
function closeEditor() {
  if (state !== 'editor') return;
  $('editor').hidden = true; renderSlots(); sfx.pickup();
  if (G.edFrom === 'pause') { state = 'play'; pauseGame(); return; }
  if (!META.codeSeen && Object.values(P.code).some(l => l.length)) { META.codeSeen = 1; saveMeta(); relay('Code accepted. That weapon runs your line now. Collect pieces, rank lines up, rewrite them any time from pause.'); }
  state = 'play'; last = performance.now();
}
function edSel(k, id) { G.sel[k] = G.sel[k] === id ? null : id; sfx.shot(); renderEditor(); }
function edInstall(id, j) {
  const { t, f, k } = G.sel, kk = k && G.inv.k[k] ? k : null;
  const lines = P.code[id] = P.code[id] || [];
  if (!(t && f && G.inv.t[t] && G.inv.f[f])) {
    // only a condition selected: attach it to an existing line (its old condition comes back)
    if (!kk || j == null || !lines[j]) return;
    const L = lines[j]; takePiece('k', kk); if (L.k) addPiece('k', L.k); L.k = kk;
    if (!G.inv.k[kk]) G.sel.k = null; sfx.evolve(); renderEditor(); return;
  }
  if (j == null) { if (lines.length >= lineCap(id)) return; takePiece('t', t); takePiece('f', f); if (kk) takePiece('k', kk); lines.push(newLine(t, f, kk)); }
  else { const old = lines[j]; if (!old) return; takePiece('t', t); takePiece('f', f); if (kk) takePiece('k', kk); addPiece('t', old.t); addPiece('f', old.f); if (old.k) addPiece('k', old.k); lines[j] = newLine(t, f, kk); G.rewrites = (G.rewrites || 0) + 1; }
  if (!G.inv.t[t]) G.sel.t = Object.keys(G.inv.t)[0] || null;
  if (!G.inv.f[f]) G.sel.f = Object.keys(G.inv.f)[0] || null;
  if (kk && !G.inv.k[kk]) G.sel.k = null;
  sfx.evolve(); renderEditor();
}
function edRemove(id, j) {
  const lines = P.code[id]; if (!lines || !lines[j]) return;
  const [old] = lines.splice(j, 1); addPiece('t', old.t); addPiece('f', old.f); G.sel.t = old.t; G.sel.f = old.f; if (old.k) { addPiece('k', old.k); G.sel.k = old.k; }
  sfx.shot(); renderEditor();
}
function renderEditor() {
  const body = $('edBody'); body.textContent = '';
  const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const { t: st, f: sf, k: sk } = G.sel, ready = !!(st && sf), attach = !ready && !!sk;
  // inventory
  const inv = mk('div', 'edinv');
  for (const [k, lab, D] of [['t', 'Triggers', TRIG], ['k', 'Conditions', COND], ['f', 'Effects', FX]]) {
    if (k === 'k' && !invN('k')) continue;
    const row = mk('div', 'edrow'); row.appendChild(mk('span', 'edlab', lab));
    const ids = Object.keys(G.inv[k]);
    if (!ids.length) row.appendChild(mk('span', 'edempty', k === 't' ? 'none · find triggers on level-up' : 'none · find effects on level-up'));
    for (const id of ids) {
      const b = mk('button', 'chip', (k === 't' ? trigTxt(id, 0) : k === 'k' ? condTxt(id) : D[id].fn + '()') + (G.inv[k][id] > 1 ? ' ×' + G.inv[k][id] : ''));
      b.type = 'button'; b.setAttribute('aria-pressed', G.sel[k] === id); b.addEventListener('click', () => edSel(k, id)); row.appendChild(b);
    }
    inv.appendChild(row);
  }
  body.appendChild(inv);
  const pre = mk('div', 'edpre');
  if (ready) { const L = newLine(st, sf, sk); pre.append(mk('code', null, lineTxt(L)), mk('span', null, lineSay(L))); }
  else if (attach) pre.append(mk('code', null, `… → ${condTxt(sk)} → …`), mk('span', null, `Tap a line to attach it. The line runs only ${COND[sk].say}, and hits 60% harder.`));
  else pre.appendChild(mk('span', null, st || sf ? `Pick ${st ? 'an effect' : 'a trigger'} to finish the line.` : 'Pick a trigger and an effect, then tap a slot to install the line.'));
  body.appendChild(pre);
  // weapons
  const wl = mk('div', 'edweps');
  for (const id of Object.keys(P.W)) {
    const lines = P.code[id] || [], cap = lineCap(id), D = WDEF[id];
    const box = mk('div', 'edw');
    const hd = mk('div', 'edwh'); hd.append(mk('span', 'ic', D.icon), mk('span', 'wn', wslug(id)), mk('span', 'cnt', `${lines.length} / ${cap} lines`)); box.appendChild(hd);
    lines.forEach((L, j) => {
      const row = mk('div', 'edline');
      const b = mk('button', 'lbtn'); b.type = 'button'; b.disabled = !ready && !attach;
      b.append(mk('code', null, lineTxt(L) + (L.r ? `  // rank ${L.r + 1}` : '')), mk('span', 'st', lineStat(L) + (ready ? '  ·  tap to rewrite' : attach ? '  ·  tap to attach ' + condTxt(sk) : '')));
      b.setAttribute('aria-label', `${lineTxt(L)}. ${lineStat(L)}.` + (ready ? ' Rewrite with the selected pieces.' : attach ? ` Attach ${condTxt(sk)}.` : ''));
      b.addEventListener('click', () => edInstall(id, j));
      const x = mk('button', 'xbtn', '✕'); x.type = 'button'; x.title = L.r ? 'Remove (pieces go back, rank is lost)' : 'Remove (pieces go back)'; x.setAttribute('aria-label', 'Remove ' + lineTxt(L));
      x.addEventListener('click', () => edRemove(id, j));
      row.append(b, x); box.appendChild(row);
    });
    for (let k = lines.length; k < cap; k++) {
      const b = mk('button', 'slotb', ready ? '+ install here' : '+ empty slot'); b.type = 'button'; b.disabled = !ready;
      b.addEventListener('click', () => edInstall(id, null)); box.appendChild(b);
    }
    if (cap < LINE_MAX) box.appendChild(mk('div', 'locked', `// next slot at ${cap < 2 ? 'level 4' : 'max level or evolution'}`));
    wl.appendChild(box);
  }
  body.appendChild(wl);
  const nT = invN('t'), nF = invN('f');
  $('edNote').textContent = invN('k') && !attach && !ready ? 'Conditions are optional. Select one alone to attach it to a line, or with a trigger and effect for a new line.' : !freeSlots() && ready ? 'Every slot is full. Tap a line to rewrite it; its old pieces return to your inventory.' : (nT || nF) && !(nT && nF) ? 'Unused pieces stay in your inventory for later.' : 'Lines can be rewritten any time from the pause screen.';
}
function banishCard(i) {
  const o = curOffers[i]; if (!o || G.banish <= 0 || state !== 'level') return;
  if (o.kind !== 'o' && o.kind !== 'c') G.banned.add(o.kind + o.id);
  G.banish--; G.banMode = false; sfx.shot();
  curOffers[i] = offers().find(n => !curOffers.some(c => c.kind === n.kind && c.id === n.id)) || offers()[0];
  renderCards();
}
function toggleBanish() { if (state !== 'level' || G.banish <= 0) return; G.banMode = !G.banMode; renderCards(); }
function skipLevel() { if (state !== 'level' || !META.ranks.skip) return; G.banMode = false; P.hp = Math.min(STAT.maxHp, P.hp + 30); $('levelup').hidden = true; state = 'play'; last = performance.now(); sfx.pickup(); }
function reroll() { if (state !== 'level' || G.rerolls <= 0) return; G.rerolls--; curOffers = offers(); renderCards(); sfx.shot(); }
function choose(i) {
  if (state !== 'level') return;
  const o = curOffers[i]; if (!o) return;
  if (o.kind === 'c') {
    if (o.up) { const L = (P.code[o.id] || [])[o.j]; if (L && L.r < LINE_MAX - 1) L.r++; $('levelup').hidden = true; renderSlots(); state = 'play'; last = performance.now(); sfx.pickup(); return; }
    if (o.piece === 'k') { addPiece('k', o.k); G.sel.k = o.k; G.sel.t = G.sel.f = null; }
    else {
    if (o.piece !== 'f') { addPiece('t', o.t); G.sel.t = o.t; }
    if (o.piece !== 't') { addPiece('f', o.f); G.sel.f = o.f; }
    }
    openEditor('level'); return;
  }
  if (o.kind === 'w') { if (P.W[o.id]) P.W[o.id].lvl++; else P.W[o.id] = { lvl: 1, t: 0.2 }; }
  else if (o.kind === 'p') { P.Pv[o.id] = (P.Pv[o.id] || 0) + 1; recalc(); if (o.id === 'vital') P.hp = Math.min(STAT.maxHp, P.hp + 20); if (o.id === 'buffer') P.sh = STAT.shieldMax; }
  else if (o.kind === 'x') { P.xl[o.id] = (P.xl[o.id] || 1) + 1; const q = G.pw.find(p => p.id === o.id); if (q) q.cd = Math.min(q.cd, powerMax(o.id)); renderPowers(); }
  else { if (o.id === 'oheal') P.hp = Math.min(STAT.maxHp, P.hp + 50); else { P.ov[o.id] = (P.ov[o.id] || 0) + 1; recalc(); if (o.id === 'ohp') P.hp = Math.min(STAT.maxHp, P.hp + 15); } }
  recalc();
  $('levelup').hidden = true; renderSlots(); state = 'play'; last = performance.now();
}

