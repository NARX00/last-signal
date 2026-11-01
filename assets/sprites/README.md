# Sprites

Images that replace how enemies or your ship are drawn. Name each file after what it replaces:

- an enemy id from `data/enemies.json`, e.g. `bug.png`, `daemon.png`, `brute.svg`
- `player.png` for your ship, or `player-lumen.png`, `player-hex.png`, `player-bastion.png` for one operator

Lancers, Watchers, Eels, Ghosts and bosses keep their drawn look, because it shows aim lines, segments or
visibility you need to read. PNG (transparent background), SVG or WebP; about 64–128 px square, under 100 KB.
Draw your ship, and any sprite set to turn toward you, facing right. Size and rotation are set in `data/sprites.json`.
See `docs/CONTENT.md`.
