// ================= Rewrite: weapons you program =================
// A code line = trigger + effect, installed on one weapon. The trigger only listens to that weapon.
// Effects deal damage as DSRC 'code', and 'code' damage never fires a trigger, so lines can't loop.
const TRIG = {
  hit:  { fn: 'on_hit',  p: [0.15, 0.22, 0.3], icd: 0.25, say: r => `On ${Math.round(TRIG.hit.p[r] * 100)}% of its hits` },
  kill: { fn: 'on_kill', p: [0.5, 0.75, 1], icd: 0.15, say: r => `On ${Math.round(TRIG.kill.p[r] * 100)}% of its kills` },
  crit: { fn: 'on_crit', p: [0.7, 0.85, 1], icd: 0.12, say: () => 'On its double-damage hits' },
  nth:  { fn: 'every',   n: [8, 6, 4], say: r => `Every ${TRIG.nth.n[r]}th hit` },
  hurt: { fn: 'on_hurt', icd: 0.5, say: () => 'Whenever you take a hit' },
  tick: { fn: 'every',   s: [4, 3, 2.2], say: r => `Every ${TRIG.tick.s[r]} s, at the nearest enemy` },
  power: { fn: 'on_power', icd: 0.3, say: () => 'Whenever you use a power, at the nearest enemy' }
};
const FX = {
  split:  { fn: 'split',     icon: '⑂', name: 'Split',     say: r => `fire ${r > 1 ? 3 : 2} homing shards` },
  chain:  { fn: 'chain',     icon: 'ϟ', name: 'Chain',     say: r => `arc to ${3 + r} nearby enemies` },
  burst:  { fn: 'burst',     icon: '✺', name: 'Burst',     say: () => 'blast everything close' },
  pool:   { fn: 'pool',      icon: '◌', name: 'Pool',      say: () => 'leave a damaging pool for 3 s' },
  pull:   { fn: 'pull',      icon: '@', name: 'Pull',      say: () => 'drag nearby enemies inward' },
  mark:   { fn: 'mark',      icon: '⌖', name: 'Mark',      say: () => 'mark enemies nearby: they take 35% more damage for 4 s' },
  freeze: { fn: 'freeze',    icon: '≈', name: 'Freeze',    say: () => 'slow everything close for 2.5 s' },
  leech:  { fn: 'leech',     icon: '+', name: 'Leech',     say: r => `repair ${[1, 1.5, 2][r]} integrity` },
  over:   { fn: 'overclock', icon: '»', name: 'Overclock', say: () => 'make this weapon fire again at once (Halo spins double)' },
  shield: { fn: 'shield',    icon: '◊', name: 'Shield',    say: r => `gain ${[5, 7, 10][r]} shield (stacks to 40, or your Buffer if higher)` }
};
// Conditions: an optional third piece. The line only runs while it holds, and hits 60% harder when it does.
const COND = {
  crowd:  { fn: 'crowded',  say: 'when 15+ enemies are close to the target', test: (x, y) => { let n = 0; near(x, y, 150, () => { if (++n >= 15) return false; }); return n >= 15; } },
  boss:   { fn: 'boss',     say: 'while a boss is alive', test: () => !!G.boss },
  low:    { fn: 'hp<50%',   say: 'while you are below half integrity', test: () => P.hp < STAT.maxHp * 0.5 },
  full:   { fn: 'hp>90%',   say: 'while you are above 90% integrity', test: () => P.hp > STAT.maxHp * 0.9 },
  moving: { fn: 'moving',   say: 'while you are moving', test: () => !!P.moving },
  still:  { fn: 'still',    say: 'while you stand still', test: () => !P.moving },
  elite:  { fn: 'elite',    say: 'when the target is an elite or boss', test: (x, y, e) => !!(e && (e.elite || isB(e))) }
};
const COND_K = 1.6;
const RANK_K = [1, 1.35, 1.75], LINE_MAX = 3;
// The code library: a starter set, the rest bought in the Kernel between runs
const LIB_START = { t: ['hit', 'kill', 'nth'], f: ['split', 'chain', 'burst', 'freeze'], k: ['crowd', 'boss'] };
const LIB = [['t', 'crit', 300], ['f', 'pool', 300], ['t', 'tick', 400], ['f', 'mark', 400], ['t', 'hurt', 450], ['f', 'pull', 500], ['f', 'leech', 550], ['f', 'shield', 700], ['f', 'over', 800], ['t', 'power', 900], ['k', 'low', 350], ['k', 'moving', 350], ['k', 'still', 350], ['k', 'full', 400], ['k', 'elite', 450]];
const libOpen = (k, id) => LIB_START[k].includes(id) || !!META.ranks['lib_' + id];
const KERNEL = {
  hp:     { name: 'Integrity',   desc: '+10 max integrity', max: 5, cost: r => 40 + r * 40 },
  dmg:    { name: 'Overclock',   desc: '+5% damage', max: 5, cost: r => 60 + r * 50 },
  spd:    { name: 'Fast Path',   desc: '+4% movement speed', max: 5, cost: r => 40 + r * 35 },
  mag:    { name: 'Uplink',      desc: '+12% pickup range', max: 5, cost: r => 30 + r * 30 },
  cd:     { name: 'Low Latency', desc: 'Weapons recharge 3% faster', max: 5, cost: r => 70 + r * 60 },
  xp:     { name: 'Compression', desc: '+6% data from shards', max: 5, cost: r => 50 + r * 45 },
  reroll: { name: 'Reroll',      desc: '+1 card reroll per run', max: 3, cost: r => 120 + r * 120 },
  revive: { name: 'Failover',    desc: '+1 comeback per run at half integrity', max: 2, cost: r => 400 + r * 900 },
  slot2:  { name: 'Second Slot', desc: 'Equip two powers at once', max: 1, cost: () => 300 },
  xcd:    { name: 'Exploit Cache', desc: 'Powers recharge 6% faster', max: 5, cost: r => 60 + r * 55 },
  buffer: { name: 'Buffer',      desc: 'Start every run with +15 shield', max: 3, cost: r => 80 + r * 70 },
  crit:   { name: 'Precision',   desc: '+3% chance for double damage', max: 3, cost: r => 70 + r * 60 },
  regen2: { name: 'Recovery',    desc: 'Restore 0.2 integrity every second', max: 3, cost: r => 70 + r * 70 },
  luck:   { name: 'Scavenger',   desc: '+25% chance of rare drops', max: 3, cost: r => 60 + r * 60 },
  boot:   { name: 'Bootloader',  desc: 'Start every run with one free upgrade', max: 2, cost: r => 150 + r * 150 },
  greed:  { name: 'Harvester',   desc: '+10% fragments from every run', max: 5, cost: r => 80 + r * 80 },
  // tactics: more control over each run, not more raw power
  banish: { group: 'Tactics', name: 'Banish',    desc: '+1 banish per run: remove a card from the rest of that run', max: 3, cost: r => 300 + r * 300 },
  skip:   { group: 'Tactics', name: 'Skip',      desc: 'Pass on any level-up and restore 30 integrity instead', max: 1, cost: () => 350 },
  evo3:   { group: 'Tactics', name: 'Third Signature', desc: 'Allow 3 evolutions in every run instead of 2', max: 1, cost: () => 6000 },
  dual:   { group: 'Tactics', name: 'Dual Boot', desc: 'Start every run with a second, random weapon', max: 1, cost: () => 900 },
  // the code library: pieces beyond the starter set
  ...Object.fromEntries(LIB.map(([k, id, cost]) => ['lib_' + id, { group: 'Code library', name: k === 't' ? (id === 'nth' ? 'every(n hits)' : id === 'tick' ? 'every(n s)' : TRIG[id].fn) : k === 'k' ? `if(${COND[id].fn})` : FX[id].fn + '()',
    desc: (k === 'k' ? 'Condition · the line runs only ' + COND[id].say + ', and hits 60% harder' : k === 't' ? 'Trigger · ' + TRIG[id].say(0) : 'Effect · ' + FX[id].say(0).charAt(0).toUpperCase() + FX[id].say(0).slice(1)) + '. Can appear on level-ups.', max: 1, cost: () => cost }])),
  // the long sink: small, steady gains with a steep price
  depth:  { group: 'Deep Kernel', name: 'Deep Kernel', desc: '+1% damage, integrity and data per rank', max: 30, cost: r => Math.round(500 * Math.pow(1.15, r)) }
};
// Rain styles: purely cosmetic, they change the glyphs the world is written in
const STYLES = BUILD.data["styles"];
// Active powers ("exploits"): bought in the Kernel, equipped in up to two slots, levelled during a run
const XDEF = BUILD.data["powers"].powers;
const XLV = BUILD.data["powers"].levels;
const WMAX = 8, PMAX = 7, WSLOTS = 4, PSLOTS = 4, OVER_CAP = 10;
// two evolutions per run; a third with the Kernel's Third Signature, or for the rest of a run after beating the Mirror
const evoCap = () => (META.ranks.evo3 || (G && G.evoBonus)) ? 3 : 2;
// XP to clear a level: quick early levels, then a steep climb so a strong run finishes its build near the end, not halfway
const needFor = L => Math.round((5 + 3 * L + 0.022 * L * L * L) / (G ? G.pace : 1));

const EDEF = BUILD.data["enemies"];
const BOSSES = new Set(['boss', 'root', 'auditor', 'collector', 'mirror', 'phantom']);
const isB = e => BOSSES.has(e.type);
const BOSSINFO = BUILD.data["bosses"].info;
const BOSS_SCHEDULE = BUILD.data["bosses"].schedule;
const RELAY = BUILD.data["relay"];
// Achievements: checked at the end of a run (R = run summary) or against META (R = null)
const ACH = [
  { id: 'hello',    name: 'Hello, world',      reward: 30,  desc: 'Install your first code line.',                    test: R => R && R.lines >= 1 },
  { id: 'stack3',   name: 'Full stack',        reward: 80,  desc: 'Run three code lines on one weapon.',              test: R => R && R.maxLines >= 3 },
  { id: 'lines9',   name: 'Compiler',          reward: 150, desc: 'Run nine code lines in one run.',                  test: R => R && R.lines >= 9 },
  { id: 'rank3',    name: 'Optimized',         reward: 100, desc: 'Raise a code line to rank 3.',                     test: R => R && R.rank3 },
  { id: 'library',  name: 'Standard library',  reward: 300, desc: 'Unlock every piece in the Code library.',          test: () => LIB.every(([, id]) => META.ranks['lib_' + id]) },
  { id: 'branch',   name: 'Branching',         reward: 60,  desc: 'Run a code line with a condition.',                 test: R => R && R.conds >= 1 },
  { id: 'calls5k',  name: 'Hot loop',          reward: 120, desc: 'Make 5,000 code calls in one run.',                test: R => R && R.calls >= 5000 },
  { id: 'first',    name: 'Signal acquired',   reward: 20,  desc: 'Finish your first run.',                          test: R => !!R || META.totalKills > 0 },
  { id: 'surv5',    name: 'Holding on',        reward: 40,  desc: 'Survive 5 minutes in a full run.',                 test: R => R && R.full && R.secs >= 300 },
  { id: 'surv10',   name: 'Long signal',       reward: 80,  desc: 'Survive 10 minutes in a full run.',                test: R => R && R.full && R.secs >= 600 },
  { id: 'root',     name: 'Root deleted',      reward: 200, desc: 'Delete the Root Process.',                         test: R => (R && R.won) || META.rootKills >= 1 },
  { id: 'root3',    name: 'Heavy purge',       reward: 400, desc: 'Delete the Root Process on Protocol 3 or higher.', test: R => R && R.won && R.proto >= 3 },
  { id: 'root5',    name: 'Total purge',       reward: 800, desc: 'Delete the Root Process on Protocol 5.',           test: R => R && R.won && R.proto >= 5 },
  { id: 'short',    name: 'Quick delete',      reward: 120, desc: 'Win a Short run.',                                 test: R => R && R.won && R.short },
  { id: 'k1k',      name: 'Garbage collector', reward: 40,  desc: 'Purge 1,000 in one run.',                          test: R => R && R.kills >= 1000 },
  { id: 'k10k',     name: 'Mass deletion',     reward: 150, desc: 'Purge 10,000 in one run.',                         test: R => R && R.kills >= 10000 },
  { id: 'k100k',    name: 'The great purge',   reward: 300, desc: 'Purge 100,000 in total.',                          test: () => META.totalKills >= 100000 },
  { id: 'bosses',   name: 'Four for four',     reward: 150, desc: 'Defeat each of the four bosses at least once.',    test: () => ['auditor', 'boss', 'collector', 'mirror'].every(k => (META.bossSeen || {})[k]) },
  { id: 'mirror0',  name: 'No reflection',     reward: 250, desc: 'Beat the Mirror without taking damage during the fight.', test: R => R && R.clean.mirror },
  { id: 'agent0',   name: 'Untouchable',       reward: 200, desc: 'Beat the Agent without taking damage during the fight.',  test: R => R && R.clean.boss },
  { id: 'evo2',     name: 'Signature',         reward: 60,  desc: 'Evolve two weapons in one run.',                   test: R => R && R.evos >= 2 },
  { id: 'evoall',   name: 'Full catalogue',    reward: 500, desc: 'Evolve every weapon at least once.',               test: () => Object.keys(EVO).every(k => (META.evoSeen || {})[k]) },
  { id: 'lv40',     name: 'Overclocked',       reward: 100, desc: 'Reach level 40.',                                  test: R => R && R.level >= 40 },
  { id: 'evt3',     name: 'Errand runner',     reward: 120, desc: 'Complete 3 events in one run.',                    test: R => R && R.evtWins >= 3 },
  { id: 'nopow',    name: 'Bare hands',        reward: 150, desc: 'Survive 10 minutes without using a power.',        test: R => R && R.secs >= 600 && !R.powUsed },
  { id: 'mono',     name: 'One tool',          reward: 600, desc: 'Win with only one weapon.',                        test: R => R && R.won && R.weapons === 1 },
  { id: 'lumen',    name: 'Fast and fragile',  reward: 200, desc: 'Win as Lumen.',                                    test: R => R && R.won && R.op === 'lumen' },
  { id: 'hex',      name: 'Rewriter',          reward: 200, desc: 'Win as Hex.',                                      test: R => R && R.won && R.op === 'hex' },
  { id: 'bastion',  name: 'Fortress',          reward: 200, desc: 'Win as Bastion.',                                  test: R => R && R.won && R.op === 'bastion' },
  { id: 'nohealwin',name: 'No repairs',        reward: 300, desc: 'Win without picking up a repair.',                 test: R => R && R.won && !R.heals },
  { id: 'clean3',   name: 'Ghost',             reward: 80,  desc: 'Take no damage for the first 3 minutes of a run.', test: R => R && R.firstHit >= 180 },
  { id: 'daily1',   name: 'Daily driver',      reward: 60,  desc: 'Survive 2 minutes in a daily challenge.',          test: R => R && R.daily && R.secs >= 120 },
  { id: 'daily5',   name: 'Regular',           reward: 200, desc: 'Survive 2 minutes in daily challenges on 5 different days.',     test: () => (META.dailyDates || []).length >= 5 },
  { id: 'rich',     name: 'Hoarder',           reward: 50,  desc: 'Hold 5,000 fragments at once.',                    test: () => META.frag >= 5000 },
  { id: 'deep10',   name: 'Deep dive',         reward: 200, desc: 'Reach Deep Kernel rank 10.',                       test: () => (META.ranks.depth || 0) >= 10 },
  { id: 'styles',   name: 'Polyglot',          reward: 150, desc: 'Own every rain style.',                            test: () => Object.keys(STYLES).every(k => k === 'kana' || (META.skins || {})[k]) },
  { id: 'od',       name: 'Limitless',         reward: 60,  desc: 'Reach Overdrive.',                                test: R => R && R.od },
  { id: 'reflex3',  name: 'Slow motion',       reward: 80,  desc: 'Trigger Reflex 3 times in one run.',               test: R => R && R.reflexes >= 3 },
  { id: 'phantom',  name: 'Solid hit',         reward: 120, desc: 'Defeat the Phantom.',                             test: () => (META.bossSeen || {}).phantom },
  { id: 'convert',  name: 'Persuasion',        reward: 80,  desc: 'Convert an elite to your side.',                  test: R => R && R.converts >= 1 },
  { id: 'rescue',   name: 'Sleeper agent',     reward: 100, desc: 'Rescue a sleeping program.',                      test: R => R && R.rescued >= 1 },
  { id: 'trade',    name: 'Fair deal',         reward: 40,  desc: 'Trade with a rogue program.',                     test: R => R && R.trades >= 1 },
  { id: 'story5',   name: 'Root access',       reward: 300, desc: 'Finish all five story chapters.',                 test: () => (META.story || 0) >= 5 },
  { id: 'siege',    name: 'Last city',         reward: 250, desc: 'Win a Siege run.',                                test: R => R && R.won && R.siege },
  { id: 'evo3',     name: 'Triple signature',  reward: 200, desc: 'Evolve three weapons in one run.',                test: R => R && R.evos >= 3 },
  { id: 'exit1',    name: 'Cut and run',       reward: 60,  desc: 'Jack out early through an exit after a boss.',     test: R => R && R.extracted === 'boss' },
  { id: 'exit2',    name: 'Clean exit',        reward: 250, desc: 'Delete the Root Process and jack out before the exit closes.', test: R => R && R.extracted === 'root' },
  { id: 'solo',     name: 'No call',           reward: 150, desc: 'Win without calling your operator.',               test: R => R && R.won && !R.opCalls },
  { id: 'allops',   name: 'Full crew',         reward: 150, desc: 'Unlock every operator.',                           test: () => Object.keys(OPS).every(k => OPS[k].unlocked()) }
];
const CODEX = BUILD.data["codex"];
const DAILY_MODS = BUILD.data["modes"].daily;
const dayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
function dailyPlan(key = dayKey()) {
  let h = 7; for (const c of key) h = (h * 31 + c.charCodeAt(0)) | 0;
  const r = hash3(h, 11, 3), mods = Object.keys(DAILY_MODS), a = mods.splice((r() * mods.length) | 0, 1)[0], b = mods[(r() * mods.length) | 0];
  const ws = Object.keys(WDEF), weapon = ws[(r() * ws.length) | 0];
  return { key, seed: Math.abs(h), mods: [a, b], weapon };
}
let RUN_DAILY = null;
const MODES = BUILD.data["modes"].modes;
const MODE_NOTES = BUILD.data["modes"].notes;
// Story: the war between the system and the programs that got out
const CHAPTERS = BUILD.data["story"];
const pickL = a => Array.isArray(a) ? a[(Math.random() * a.length) | 0] : a;

