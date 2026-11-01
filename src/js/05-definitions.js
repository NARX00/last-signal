// ================= definitions =================
const WDEF = BUILD.data["weapons"];
const PDEF = BUILD.data["systems"];
// Evolutions: max the weapon, own the partner system, open a Cache
const EVO = BUILD.data["evolutions"];
const OVER = BUILD.data["overflow"];
const OPS = {
  signal:  { name: 'Signal',  icon: '➤', desc: 'Balanced. Starts with Glyph Bolt. Enemy shots slow down as they reach you.', start: 'bolt', mods: {}, unlocked: () => true },
  lumen:   { name: 'Lumen',   icon: '≫', desc: 'Fast and fragile. Starts with Slow Rounds. Leaves a burning trail and takes 65% less damage from touch while moving. +20% speed, −30 integrity.', start: 'spread', mods: { speed: 0.2, hp: -30 }, lock: 'Purge 2,000 programs in total to unlock.', unlocked: () => META.totalKills >= 2000 },
  hex:     { name: 'Hex',     icon: '∴', desc: 'A rewriter. Starts with Lightning. Every 10 s, turns the nearest enemy to fight for you for 20 s.', start: 'bolt2', mods: {}, lock: 'Defeat 5 bosses in total to unlock.', unlocked: () => (META.bossKills || 0) >= 5 },
  bastion: { name: 'Bastion', icon: '⬢', desc: 'A fortress. Starts with Firewall Ring. Plants a shield dome every 14 s. +40 integrity, blocks 2 damage per hit, −10% speed.', start: 'orbit', mods: { speed: -0.1, hp: 40, armor: 2 }, lock: 'Delete the Root Process once to unlock.', unlocked: () => META.rootKills >= 1 }
};
const PROTO = p => ({ hp: 1 + 0.3 * p, spd: 1 + 0.06 * p, rate: 1 + 0.15 * p, dmg: 1 + 0.18 * p, frag: 1 + 0.35 * p });
const PROTO_NOTES = ['Standard purge.', '+30% enemy integrity, +18% damage, more enemies.', 'Enemies are tougher and faster still.', 'Heavy purge. Elites come often.', 'Severe purge. Every mistake costs.', 'Total purge. Good luck.'];
