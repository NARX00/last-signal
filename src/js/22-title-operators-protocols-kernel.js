// ================= title: operators, protocols, kernel =================
function renderTitle() {
  renderAftermarket();
  const ops = $('ops'); ops.textContent = '';
  if (!(META.op in OPS) || !OPS[META.op].unlocked()) META.op = 'signal';
  for (const id in OPS) {
    const O = OPS[id], open = O.unlocked();
    const b = document.createElement('button'); b.type = 'button'; b.className = 'op'; b.disabled = !open; b.setAttribute('aria-pressed', META.op === id);
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = (open ? O.icon : '▣') + ' ' + O.name;
    const ds = document.createElement('span'); ds.className = 'ds'; ds.textContent = open ? O.desc : O.lock;
    b.append(nm, ds);
    b.addEventListener('click', () => { META.op = id; saveMeta(); renderTitle(); });
    ops.appendChild(b);
  }
  META.proto = clamp(META.proto | 0, 0, META.protoMax);
  const pr = $('protos'); pr.textContent = '';
  for (let p = 0; p <= 5; p++) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'proto' + (p >= 3 ? ' hot' : ''); b.textContent = p;
    b.disabled = p > META.protoMax; b.setAttribute('aria-pressed', META.proto === p); b.setAttribute('aria-label', 'Protocol ' + p);
    b.addEventListener('click', () => { META.proto = p; saveMeta(); renderTitle(); });
    pr.appendChild(b);
  }
  if (!MODES.some(m => m[0] === META.mode)) META.mode = 'full';
  const md = $('modes'); md.textContent = '';
  for (const [id, lab] of MODES) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'proto wide'; b.textContent = lab; b.setAttribute('aria-pressed', META.mode === id);
    b.addEventListener('click', () => { META.mode = id; saveMeta(); renderTitle(); });
    md.appendChild(b);
  }
  $('modeNote').textContent = MODE_NOTES[META.mode];
  const ch = $('chapters'); ch.textContent = ''; ch.hidden = META.mode !== 'story';
  if (META.mode === 'story') {
    META.chapter = clamp(META.chapter || 1, 1, Math.min(5, (META.story || 0) + 1));
    CHAPTERS.forEach((c, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'proto wide'; b.textContent = `${i + 1} · ${c.name}` + ((META.story || 0) > i ? ' ✓' : '');
      b.disabled = i > (META.story || 0); b.setAttribute('aria-pressed', META.chapter === i + 1);
      b.addEventListener('click', () => { META.chapter = i + 1; saveMeta(); renderTitle(); }); ch.appendChild(b);
    });
  }
  renderContinue();
  $('startBtn').textContent = META.mode === 'story' ? `Play chapter ${META.chapter}` : META.mode === 'training' ? 'Start training' : 'Start run';
  const pm = PROTO(META.proto);
  $('protoNote').textContent = `Protocol ${META.proto}: ${PROTO_NOTES[META.proto]} Fragments ×${pm.frag.toFixed(2)}.` + (META.protoMax < 5 ? ` Delete the Root Process on Protocol ${META.protoMax} to unlock ${META.protoMax + 1}.` : '');
  $('fragBal').textContent = '◆ ' + META.frag;
  renderCodex(); renderDaily();
  const slots = META.ranks.slot2 ? 2 : 1;
  const names = [0, 1].map(i => i < slots ? (META.load[i] && META.xown[META.load[i]] ? XDEF[META.load[i]].icon + ' ' + XDEF[META.load[i]].name : 'empty') : null);
  const lo = $('loadout'); lo.textContent = '';
  const b1 = document.createElement('b'); b1.textContent = 'Q: ' + names[0]; lo.appendChild(b1);
  lo.appendChild(document.createTextNode(' · '));
  if (names[1]) { const b2 = document.createElement('b'); b2.textContent = 'E: ' + names[1]; lo.appendChild(b2); } else lo.appendChild(document.createTextNode('second slot locked'));
  lo.appendChild(document.createTextNode(' · '));
  const lk = document.createElement('button'); lk.type = 'button'; lk.className = 'linkish'; lk.textContent = 'Change powers'; lk.addEventListener('click', () => showTab('exploits')); lo.appendChild(lk);
  const xb = $('exploits'); xb.textContent = '';
  for (const id in XDEF) {
    const D = XDEF[id], own = !!META.xown[id];
    const row = document.createElement('div'); row.className = 'xrow' + (own ? '' : ' locked');
    const xi = document.createElement('span'); xi.className = 'xi'; xi.textContent = D.icon;
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = D.name;
    const sm = document.createElement('small'); sm.textContent = `${D.cd} s recharge`; nm.appendChild(sm);
    const ds = document.createElement('span'); ds.className = 'ds'; ds.textContent = D.desc;
    const acts = document.createElement('div'); acts.className = 'acts';
    if (!own) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn buy'; b.textContent = `◆ ${D.cost}`; b.disabled = META.frag < D.cost;
      b.setAttribute('aria-label', `Buy ${D.name} for ${D.cost} fragments`);
      b.addEventListener('click', () => { if (META.frag < D.cost) return; META.frag -= D.cost; META.xown[id] = true; if (!META.load[0]) META.load[0] = id; else if (slots > 1 && !META.load[1]) META.load[1] = id; saveMeta(); sfx.init(); sfx.buy(); renderTitle(); });
      acts.appendChild(b);
    } else for (let k = 0; k < slots; k++) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = k ? 'E' : 'Q';
      b.setAttribute('aria-pressed', META.load[k] === id); b.setAttribute('aria-label', `Put ${D.name} in slot ${k ? 'E' : 'Q'}`);
      b.addEventListener('click', () => { const other = META.load[1 - k]; if (other === id) META.load[1 - k] = META.load[k]; META.load[k] = META.load[k] === id && k === 1 ? null : id; saveMeta(); renderTitle(); });
      acts.appendChild(b);
    }
    row.append(xi, nm, acts, ds); xb.appendChild(row);
  }
  const k = $('kernel'); k.textContent = '';
  let grp = null;
  for (const id in KERNEL) {
    const D = KERNEL[id], r = META.ranks[id] || 0, cost = D.cost(r), maxed = r >= D.max;
    if ((D.group || 'Core') !== grp) { grp = D.group || 'Core'; const h = document.createElement('h4'); h.className = 'kgroup'; h.textContent = grp; k.appendChild(h); }
    const row = document.createElement('div'); row.className = 'krow';
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = D.name;
    if (D.max > 6) { const rk = document.createElement('span'); rk.className = 'rank'; rk.textContent = `${r} / ${D.max}`; nm.appendChild(rk); }
    else { const pips = document.createElement('span'); pips.className = 'pips'; for (let i = 0; i < D.max; i++) { const p = document.createElement('i'); if (i < r) p.className = 'on'; pips.appendChild(p); } nm.appendChild(pips); }
    const ds = document.createElement('span'); ds.className = 'ds'; ds.textContent = D.desc;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = maxed ? (D.group === 'Code library' ? 'Unlocked' : 'Maxed') : `◆ ${cost}`; b.disabled = maxed || META.frag < cost;
    b.setAttribute('aria-label', maxed ? `${D.name} maxed` : `Buy ${D.name} for ${cost} fragments`);
    b.addEventListener('click', () => { if (META.frag < cost || maxed) return; META.frag -= cost; META.ranks[id] = r + 1; saveMeta(); sfx.init(); sfx.buy(); metaAch(); renderTitle(); });
    row.append(nm, b, ds); k.appendChild(row);
  }
  const h = document.createElement('h4'); h.className = 'kgroup'; h.textContent = 'Rain style'; k.appendChild(h);
  for (const id in STYLES) {
    const D = STYLES[id], own = id === 'kana' || (META.skins || {})[id], on = (META.skin || 'kana') === id;
    const row = document.createElement('div'); row.className = 'krow';
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = D.name;
    const sm = document.createElement('span'); sm.className = 'rank'; sm.textContent = D.set.slice(0, 6); nm.appendChild(sm);
    const ds = document.createElement('span'); ds.className = 'ds'; ds.textContent = 'Cosmetic. The rain and every glyph enemy is written in it.';
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn';
    if (own) { b.classList.add('use'); b.textContent = on ? 'In use' : 'Use'; b.disabled = on; b.addEventListener('click', () => { META.skin = id; saveMeta(); applyStyle(); renderTitle(); }); }
    else { b.textContent = `◆ ${D.cost}`; b.disabled = META.frag < D.cost; b.addEventListener('click', () => { if (META.frag < D.cost) return; META.frag -= D.cost; META.skins = Object.assign({}, META.skins, { [id]: true }); META.skin = id; saveMeta(); sfx.init(); sfx.buy(); applyStyle(); metaAch(); renderTitle(); }); }
    row.append(nm, b, ds); k.appendChild(row);
  }
}
function renderCodex() {
  const el = $('codex'); if (!el) return; el.textContent = '';
  const got = META.ach || {}, n = ACH.filter(a => got[a.id]).length;
  const h = document.createElement('h4'); h.className = 'kgroup'; h.textContent = `Achievements · ${n} / ${ACH.length}`; el.appendChild(h);
  for (const a of ACH) {
    const row = document.createElement('div'); row.className = 'krow' + (got[a.id] ? ' done' : '');
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = (got[a.id] ? '✓ ' : '') + a.name;
    const rw = document.createElement('span'); rw.className = 'rw'; rw.textContent = got[a.id] ? 'Done' : `◆ ${a.reward}`;
    const ds = document.createElement('span'); ds.className = 'ds'; ds.textContent = a.desc;
    row.append(nm, rw, ds); el.appendChild(row);
  }
  const h2 = document.createElement('h4'); h2.className = 'kgroup'; const seen = META.seen || {}; h2.textContent = `Enemies · ${Object.keys(CODEX).filter(k => seen[k]).length} / ${Object.keys(CODEX).length}`; el.appendChild(h2);
  for (const k in CODEX) {
    const row = document.createElement('div'); row.className = 'krow';
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = seen[k] ? CODEX[k][0] : '???';
    const ds = document.createElement('span'); ds.className = 'ds'; ds.textContent = seen[k] ? CODEX[k][1] : 'Not met yet.';
    row.append(nm, ds); el.appendChild(row);
  }
}
function renderDaily() {
  const el = $('dailyMods'); if (!el) return;
  const D = dailyPlan(), done = (META.dailyBest || {})[D.key];
  el.textContent = `${D.key} · Operator Signal, Protocol 1, 8:00, starting with ${WDEF[D.weapon].name}. ${D.mods.map(m => DAILY_MODS[m]).join('. ')}.` + (done ? ` Your best today: ${fmt(done.secs)}, ${done.kills} purged.` : '');
}
function applyStyle() { const st = STYLES[META.skin] && (META.skin === 'kana' || (META.skins || {})[META.skin]) ? STYLES[META.skin] : STYLES.kana; GLYPHS = st.set; if (typeof buildRain === 'function' && W) buildRain(); }

function setTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', t.dataset.tab === name));
  document.querySelectorAll('[data-panel]').forEach(p => p.hidden = p.dataset.panel !== name);
}
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => setTab(t.dataset.tab)));
// open a tab from elsewhere on the title screen: switch to it, bring it into view and flash it so the change is seen
function showTab(name) {
  setTab(name);
  const tab = document.querySelector(`.tab[data-tab="${name}"]`), panel = document.querySelector(`[data-panel="${name}"]`);
  const bar = tab && tab.closest('[role="tablist"]') || tab;
  if (bar) bar.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  if (panel) { panel.classList.remove('flash'); void panel.offsetWidth; panel.classList.add('flash'); }
  if (tab) tab.focus({ preventScroll: true });
}

