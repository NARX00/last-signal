// ================= state =================
let ghosts = [];
let toastT = 0;
function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 3200); }
let G = null, P, STAT, cam = { x: 0, y: 0 }, enemies = [], shots = [], eshots = [], gems = [], pickups = [], rings = [], wells = [], zaps = [], sparks = [], texts = [];
let state = 'title', eid = 0, shake = 0;
const ROOT_T = 900;

function newRun() {
  const D = RUN_DAILY;
  const op = D ? 'signal' : (META.op in OPS && OPS[META.op].unlocked()) ? META.op : 'signal';
  const proto = D ? 1 : (META.mode === 'story' || META.mode === 'training') ? 0 : clamp(META.proto | 0, 0, META.protoMax);
  const mode = D ? 'daily' : META.mode || 'full', CH = mode === 'story' ? CHAPTERS[clamp((META.chapter || 1) - 1, 0, 4)] : null;
  G = { mode, chapter: CH ? clamp(META.chapter || 1, 1, 5) : 0, CH, goalTxt: '', core: null, turrets: [], partsUsed: 0, training: mode === 'training', anoms: [], nextAnom: 150, rescue: null, nextRescue: 270, trader: null, nextTrader: 220, allies: 0, rescued: 0, progs: [], reflex: 0, reflexT: -1, runT: 0, idleT: 0, od: false, odT: 0, sightT: -1, empT: -1, empSelfT: -1, nextHidden: 200, slashes: [], opCharge: 0, opCalls: 0, tblocks: [], traceT: -1, exit: null, ending: false, introT: 0, extracted: false, evt: null, nextEvt: 150, dmg: {}, mines: [], seed: (Math.random() * 1e9) | 0, t: 0, kills: 0, level: 1, xp: 0, need: 5, pace: CH ? CH.pace : D || mode === 'short' ? 900 / 480 : mode === 'siege' ? 1.5 : 1, daily: D, mods: D ? Object.fromEntries(D.mods.map(m => [m, true])) : {}, hits: 0, firstHit: -1, powUsed: false, heals: 0, clean: {}, met: {}, pools: [], dropCd: {}, threat: 1, threatPeak: 1, thrT: 0, thrSeen: false, pending: 0, spawnAcc: 0, nextWave: 60, nextElite: 80, bosses: BOSS_SCHEDULE.map(([t, type]) => ({ t, type, warned: false })), rootSpawned: false, rootWarned: false, boss: null,
        op, proto, PM: PROTO(proto), elites: 0, bossKills: 0, rerolls: META.ranks.reroll || 0, revives: META.ranks.revive || 0, combo: 0, comboT: 0, overtime: false,
        pw: [], freezeT: -1, slowT: -1, decoy: null, marks: [], erings: [], arena: null, trail: [], trailT: 0, trailHit: 0, hexT: 0, bulT: 8, bulwark: null, lowT: -99, waves: 0, eliteSeen: false, cpools: [], codeFires: 0, inv: { t: {}, f: {}, k: {} }, sel: { t: null, f: null, k: null }, edFrom: null };
  P = { code: {}, phaseT: -1, leap: null, x: 0, y: 0, r: 11, hp: 100, inv: 0, fx: 1, fy: 0, W: {}, Pv: {}, ov: {}, evo: {}, xl: {}, sh: 0, lastHit: -9, shellT: -1 };
  const slots = (META.ranks.slot2 ? 2 : 1);
  for (let k = 0; k < slots; k++) { const id = META.load[k]; if (id && XDEF[id] && META.xown[id] && !G.pw.some(p => p.id === id)) { G.pw.push({ id, cd: 0, max: 1 }); P.xl[id] = 1; } }
  G.need = needFor(1);
  G.pending = META.ranks.boot || 0;
  P.W[D ? D.weapon : OPS[op].start] = { lvl: 1, t: 0.4 };
  if (D) G.seed = D.seed;
  if (G.pace > 1.6) { G.PM = Object.assign({}, G.PM, { hp: G.PM.hp * 0.85, dmg: G.PM.dmg * 0.9 }); }
  if (mode === 'siege' || (CH && CH.goal === 'core')) G.core = { x: 0, y: 0, hp: 3500, max: 3500, pulse: 3 };
  if (CH && CH.goal === 'events') { G.nextEvt = 60; }
  if (CH && CH.goal === 'rescue') { G.nextRescue = 90; }
  if (CH && (CH.goal === 'events' || CH.goal === 'rescue' || CH.goal === 'core' || CH.goal === 'survive')) G.bosses = G.bosses.filter(b => b.t < 400);
  if (G.training) { G.opCharge = 100; G.pending = 0; }
  if (META.ranks.dual) { const o = Object.keys(WDEF).filter(k => !P.W[k]); P.W[o[(Math.random() * o.length) | 0]] = { lvl: 1, t: 0.8 }; }
  // new players meet the systems a few at a time; daily, story, siege and training always have everything
  G.gate = (mode === 'full' || mode === 'short') && (META.totalKills || 0) < 5000 ? Math.min(3, META.runsN || 0) : 3;
  G.banish = META.ranks.banish || 0; G.banned = new Set(); G.banMode = false;
  obCache.clear();
  enemies = []; shots = []; eshots = []; gems = []; pickups = []; rings = []; wells = []; zaps = []; sparks = []; texts = []; ghosts = [];
  cam.x = 0; cam.y = 0; shake = 0;
  recalc(); P.hp = STAT.maxHp; P.sh = STAT.shieldMax;
  initRunExtras();
  renderSlots(); renderPowers(); updateHud(true);
}
function recalc() {
  const L = id => P.Pv[id] || 0, K = id => META.ranks[id] || 0, O = id => P.ov[id] || 0, M = OPS[G.op].mods;
  STAT = {
    dmg: 1 + 0.12 * L('might') + 0.05 * K('dmg') + 0.06 * O('odmg'),
    area: 1 + 0.1 * L('area') + 0.06 * O('oarea'),
    cd: Math.max(0.35, 1 - 0.07 * L('cool') - 0.03 * K('cd') - 0.03 * O('ocd')),
    speed: 165 * (1 + 0.1 * L('swift') + 0.04 * K('spd') + 0.04 * O('ospd') + (M.speed || 0)),
    magnet: 95 * (1 + 0.4 * L('magnet') + 0.12 * K('mag')),
    maxHp: 100 + 20 * L('vital') + 10 * K('hp') + 15 * O('ohp') + (M.hp || 0),
    regen: 0.4 * L('regen') + 0.2 * K('regen2'),
    armor: M.armor || 0,
    shieldMax: 25 * L('buffer') + 15 * K('buffer'),
    crit: 0.06 + 0.08 * L('crit') + 0.03 * K('crit'),
    thorns: 30 * L('thorns'),
    dur: 1 + 0.12 * L('dur'), blen: 1 + 0.06 * L('dur'), echo: 0.06 * L('echo'),
    luck: 1 + 0.25 * K('luck'),
    xcd: 1 - 0.06 * K('xcd'),
    xp: (1 + 0.06 * K('xp') + 0.08 * O('oxp')) * (1 + 0.01 * K('depth'))
  };
  if (G.mods.glass) { STAT.maxHp = Math.round(STAT.maxHp * 0.6); STAT.dmg *= 1.25; }
  if(G.specialization==='phantom'){STAT.speed*=1.1;STAT.maxHp=Math.round(STAT.maxHp*.9);}
  if(G.specialization==='gunslinger')STAT.xcd*=1.1;
  if(G.specialization==='codebreaker')STAT.magnet*=.9;
  if(G.mutation==='mines') STAT.speed*=.92;
  if(G.mutation==='clone') STAT.xcd*=1.2;
  STAT.dmg *= 1 + 0.01 * K('depth'); STAT.maxHp = Math.round(STAT.maxHp * (1 + 0.01 * K('depth')));
}
const lineCap = id => { const w = P.W[id]; return !w ? 0 : 1 + (w.lvl >= 4 ? 1 : 0) + (w.lvl >= WMAX || P.evo[id] ? 1 : 0); };
const trigTxt = (t, r) => t === 'nth' ? `every(${TRIG.nth.n[r]} hits)` : t === 'tick' ? `every(${TRIG.tick.s[r]}s)` : TRIG[t].fn;
const condTxt = k => `if(${COND[k].fn})`;
const lineTxt = L => `${trigTxt(L.t, L.r)} → ${L.k ? condTxt(L.k) + ' → ' : ''}${FX[L.f].fn}()`;
const lineSay = L => `${TRIG[L.t].say(L.r)}${L.k ? ', ' + COND[L.k].say : ''}: ${FX[L.f].say(L.r)}${L.k ? ' (60% harder)' : ''}.`;
const wslug = id => (P.evo[id] ? EVO[id].name : WDEF[id].name).toLowerCase().replace(/[^a-z0-9]+/g, '_');
function cpow(id) { const w = P.W[id]; return (8 + 3 * (w ? w.lvl : 1)) * (P.evo[id] ? 1.3 : 1); }
function codeEvent(src, kind, e) {
  const lines = P.code[src]; if (!lines) return;
  for (const L of lines) {
    if (L.t === 'nth') { if (kind !== 'hit' || (L.k && L.n + 1 >= TRIG.nth.n[L.r] && !COND[L.k].test(e.x, e.y, e)) || ++L.n < TRIG.nth.n[L.r]) continue; L.n = 0; }
    else { if (L.t !== kind || G.t < L.cd || Math.random() > TRIG[kind].p[L.r] || (L.k && !COND[L.k].test(e.x, e.y, e))) continue; L.cd = G.t + TRIG[kind].icd; }
    runFx(src, L, e.x, e.y, e);
  }
}
function codeHurt(src, kind = 'hurt') {
  for (const id in P.code) for (const L of P.code[id]) {
    if (L.t !== kind || G.t < L.cd) continue;
    const e = src && !src.dead && src.x !== undefined ? src : kind === 'power' ? nearest(P.x, P.y, 420) : null;
    if (L.k && !COND[L.k].test(e ? e.x : P.x, e ? e.y : P.y, e)) continue;
    L.cd = G.t + TRIG[kind].icd;
    runFx(id, L, e ? e.x : P.x, e ? e.y : P.y, e);
  }
}
// one sample a minute, so a run's shape can be read back afterwards
function sampleRun() {
  if (G.t < (G.nextSample || 60)) return;
  G.nextSample = (G.nextSample || 60) + 60;
  (G.samples = G.samples || []).push({ m: Math.round(G.t / 60), lv: G.level, k: G.kills, hp: Math.round(P.hp / STAT.maxHp * 100), hits: G.hits, en: enemies.length, thr: +G.threat.toFixed(2), code: Math.round(G.dmg.code || 0) });
}
function codeTick(dt) {
  sampleRun();
  for (const id in P.code) for (const L of P.code[id]) {
    if (L.t !== 'tick') continue;
    L.n += dt; if (L.n < TRIG.tick.s[L.r]) continue;
    const e = nearest(P.x, P.y, 420);
    if (!e && L.f !== 'leech' && L.f !== 'over' && L.f !== 'shield') continue;
    if (L.k && !COND[L.k].test(e ? e.x : P.x, e ? e.y : P.y, e)) continue;
    L.n = 0; runFx(id, L, e ? e.x : P.x, e ? e.y : P.y, e);
  }
}
function runFx(src, L, x, y, e) {
  if (L.f === 'over' && G.t < (L.ocd || 0)) return;
  const save = DSRC, saveL = CODE_L; DSRC = 'code'; CODE_L = L;
  const ck = L.k ? COND_K : 1, pw = cpow(src) * RANK_K[L.r] * ck, A = STAT.area;
  G.codeFires++; L.fired++;
  switch (L.f) {
    case 'split': {
      const used = new Set(e ? [e] : []), n = L.r > 1 ? 3 : 2;
      for (let k = 0; k < n; k++) {
        const t = nearest(x, y, 360, used); if (t) used.add(t);
        const a = t ? Math.atan2(t.y - y, t.x - x) : rand(0, TAU);
        if (shots.length < 700) shots.push({ x, y, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, r: 5, dmg: pw * 0.6, pierce: 1, life: 1, ch: pick(), kind: 'code', hit: new Set(e ? [e] : []), homing: true, src: 'code', line: L });
      }
      break;
    }
    case 'chain': {
      const used = new Set(); let from = e || { x, y }; if (e) used.add(e);
      for (let c = 0; c < 3 + L.r; c++) {
        const nx = nearest(from.x, from.y, 200, used); if (!nx) break; used.add(nx);
        zaps.push({ pts: jag(from.x, from.y, nx.x, nx.y, 5), t: 0, life: 0.2, col: CYAN });
        hurt(nx, pw * 0.55, 0, 0, true); from = nx;
      }
      break;
    }
    case 'burst': rings.push({ x, y, r: 0, max: 80 * A, w: 16, dmg: pw * 0.8, hit: new Set(), t: 0, col: CYAN, kb: 160, src: 'code', line: L }); break;
    case 'pool': if (G.cpools.length < 24) G.cpools.push({ k: 'pool', x, y, R: 50 * A, t: 0, dur: 3 * STAT.dur, tick: 0, dmg: pw * 0.3, line: L }); break;
    case 'pull': if (G.cpools.length < 24) G.cpools.push({ k: 'pull', x, y, R: 120 * A, t: 0, dur: 1.3, tick: 0, dmg: pw * 0.12, line: L }); break;
    case 'mark': near(x, y, 90 * A, o => { if (o.patch === 'mark' || (o.patchT > G.t && o.patchF === 'mark')) return; o.markT = G.t + 4; L.marks++; }); break;
    case 'freeze': near(x, y, 80 * A, o => { if (o.patch === 'freeze' || (o.patchT > G.t && o.patchF === 'freeze')) return; o.slowT = G.t + 2.5; L.marks++; }); burst(x, y, 6, CYAN, 100); if (e) hurt(e, pw * 0.3, 0, 0, true); break;
    case 'leech': if (G.t > (G.leechT || 0)) { G.leechT = G.t + 0.3; const h0 = P.hp; P.hp = Math.min(STAT.maxHp, P.hp + [1, 1.5, 2][L.r] * ck); L.heal += P.hp - h0; } break;
    case 'shield': { const s0 = P.sh; P.sh = Math.max(P.sh, Math.min(Math.max(STAT.shieldMax, 40), P.sh + [5, 7, 10][L.r] * ck)); L.heal += P.sh - s0; break; }
    case 'over': { const w = P.W[src]; L.ocd = G.t + 0.6; if (w) { if (src === 'orbit') w.boost = G.t + 1; else w.t = Math.min(w.t, 0.04); } break; }
  }
  if (G.t > (L.show || 0)) { L.show = G.t + 0.9; if (texts.length > 70) texts.shift(); texts.push({ x, y: y - 18, v: FX[L.f].fn + '()', code: true, t: 0 }); }
  DSRC = save; CODE_L = saveL;
}
function updateCode(dt) {
  codeTick(dt);
  DSRC = 'code';
  for (const q of G.cpools) {
    CODE_L = q.line || null;
    q.t += dt; q.tick -= dt; const tk = q.tick <= 0; if (tk) q.tick = q.k === 'pool' ? 0.4 : 0.3;
    near(q.x, q.y, q.R + 20, e => {
      const dx = q.x - e.x, dy = q.y - e.y, d = Math.hypot(dx, dy); if (d > q.R + e.r) return;
      if (q.k === 'pull' && !isB(e) && e.patch !== 'pull' && !(e.patchT > G.t && e.patchF === 'pull')) { const f = Math.max(0, 1 - d / q.R) * 280 * dt; e.x += dx / (d || 1) * f; e.y += dy / (d || 1) * f; }
      if (tk) hurt(e, q.dmg, 0, 0, true);
    });
  }
  G.cpools = G.cpools.filter(q => q.t < q.dur);
  DSRC = 'other'; CODE_L = null;
}
// Code comes as separate pieces: a trigger or an effect. You combine them yourself in the editor.
const invN = k => Object.values(G.inv[k]).reduce((a, b) => a + b, 0);
const freeSlots = () => Object.keys(P.W).reduce((a, id) => a + Math.max(0, lineCap(id) - (P.code[id] || []).length), 0);
const rndKey = (o, kind) => { const k = Object.keys(o).filter(id => libOpen(kind, id)); return k[(Math.random() * k.length) | 0]; };
function topFx() {
  let best = null, bv = 0;
  for (const id in P.code) for (const L of P.code[id]) { const v = L.dmg + L.marks * 20 + (['over', 'leech', 'shield'].includes(L.f) ? 0 : 0); if (v > bv) { bv = v; best = L.f; } }
  return bv > 300 ? best : null;
}
function progText(short) {
  const ids = Object.keys(P.code).filter(id => P.code[id].length);
  if (short) {
    const all = []; for (const id of ids) for (const L of P.code[id]) all.push(L);
    all.sort((a, b) => (b.dmg + b.marks * 20 + b.heal * 10) - (a.dmg + a.marks * 20 + a.heal * 10));
    return all.slice(0, 3).map(L => `${trigTxt(L.t, L.r)}→${L.k ? condTxt(L.k) + '→' : ''}${FX[L.f].fn}()`).join(' · ').slice(0, 160);
  }
  const head = `// Last Signal: Rewrite · ${fmt(G.t)} · level ${G.level} · ${G.kills.toLocaleString()} purged` + (G.rootDeleted ? ' · root deleted' : '');
  return [head, ...ids.map(id => `${wslug(id)} {\n` + P.code[id].map(L => `  ${lineTxt(L)}${L.r ? '  // rank ' + (L.r + 1) : ''}  // ${lineStat(L)}`).join('\n') + '\n}')].join('\n');
}
async function copyProgram() {
  const txt = progText();
  let ok = false;
  try { await navigator.clipboard.writeText(txt); ok = true; } catch (_) {}
  if (!ok) { try { const ta = document.createElement('textarea'); ta.value = txt; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;top:0'; document.body.appendChild(ta); ta.select(); ok = document.execCommand('copy'); ta.remove(); } catch (_) {} }
  toast(ok ? 'Program copied. Paste it anywhere.' : "Couldn't reach the clipboard. Select the program text and copy it.");
}
const codeLines = () => Object.values(P.code).reduce((a, l) => a + l.length, 0);
const hasFx = (...fs) => Object.values(P.code).some(l => l.some(L => fs.includes(L.f)));
function codeOffers() {
  const out = [], nT = invN('t'), nF = invN('f'), room = freeSlots() > Math.min(nT, nF);
  if (room && !nT && !nF) out.push({ kind: 'c', piece: 'b', t: rndKey(TRIG, 't'), f: rndKey(FX, 'f'), wt: 1.5 });
  else if (room) { const pc = nT < nF ? 't' : nF < nT ? 'f' : Math.random() < 0.5 ? 't' : 'f'; out.push({ kind: 'c', piece: pc, t: rndKey(TRIG, 't'), f: rndKey(FX, 'f'), wt: 1.4 }); }
  else if (nT + nF < 2 && Object.values(P.code).some(l => l.length)) out.push({ kind: 'c', piece: Math.random() < 0.5 ? 't' : 'f', t: rndKey(TRIG, 't'), f: rndKey(FX, 'f'), wt: 0.5 });
  const ups = [];
  for (const id in P.code) P.code[id].forEach((L, j) => { if (L.r < LINE_MAX - 1) ups.push({ kind: 'c', id, j, t: L.t, f: L.f, r: L.r, up: true, wt: 1.0 }); });
  if (codeLines() >= 2 && invN('k') < 2 && Object.values(P.code).some(l => l.some(L => !L.k))) { const k = rndKey(COND, 'k'); if (k) out.push({ kind: 'c', piece: 'k', k, t: 'hit', f: 'burst', wt: 0.8 }); }
  if (ups.length) out.push(ups[(Math.random() * ups.length) | 0]);
  return out;
}
function newLine(t, f, k) { return { t, f, k: k || null, r: 0, cd: 0, n: 0, fired: 0, show: 0, dmg: 0, heal: 0, marks: 0 }; }
const evoReady = id => !!(P.W[id] && P.W[id].lvl >= WMAX && !P.evo[id] && (P.Pv[EVO[id].need] || 0) > 0 && Object.keys(P.evo).length < evoCap());

