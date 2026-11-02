# Adding content to Last Signal

Most new content is data or a file in a folder. You only touch code for behaviour that's genuinely new,
like a new attack pattern.

After any change:

    python tools/check.py      catches mistakes (bad JSON, wrong names, oversized files)
    python tools/build.py      rebuilds index.html; open it in a browser to try it
    git commit and push        GitHub Actions checks, builds and publishes it

## Project layout

| Folder | What's in it |
|---|---|
| `src/js/` | The game code, split by topic. Files are joined in name order into one script, so they share one scope. |
| `src/styles/` | The CSS, joined in name order. |
| `src/body.html` | The page markup: title screen, HUD, menus. |
| `data/` | Tables you can edit: enemies, weapons, systems, bosses, texts. Each file is available to the code as `BUILD.data['<file name>']`. |
| `assets/` | Optional art and music. Anything missing falls back to what the game draws and plays itself. |
| `tools/` | `build.py`, `check.py`, `sim.py`, `i18n.py`, `i18n_scan.py`. |
| `i18n/` | Translations (Russian). |
| `index.html` | The built game (committed, so it also opens straight from disk). Don't edit it by hand. |

## Enemies

### Change an existing enemy

Edit its numbers in `data/enemies.json`:

| Field | Meaning |
|---|---|
| `hp` | integrity at the start of a run (it grows with time and Protocol) |
| `spd` | speed in pixels per second |
| `r` | radius in pixels (size and hit area) |
| `dmg` | contact damage |
| `xp` | shard value when it dies |

Text for the Codex lives in `data/codex.json` as `"id": ["Name", "Description"]`.

### Add a new enemy without code

Add an entry with a `spawn` block. It walks straight at you, like most enemies:

```json
"glitch": {
  "hp": 40, "spd": 70, "r": 14, "dmg": 10, "xp": 4,
  "spawn": { "from": 300, "weight": 0.4, "ramp": 0.2, "max": 1.5, "modes": ["full", "short"] },
  "look": { "shape": "diamond", "color": "#ffd24a", "glyph": "Ж" }
}
```

- `spawn.from`: seconds into the run before it can appear (in Short mode time runs faster, as for every enemy)
- `spawn.weight`: how often it's picked compared with others. For scale, bugs are 6–10 and daemons up to 6.
- `spawn.ramp`: added to the weight every minute after `from` (optional)
- `spawn.max`: cap on the weight (optional)
- `spawn.modes`: only in these modes (optional; default is every mode)
- `look`: how it's drawn when it has no sprite. `shape` is `circle`, `square`, `diamond` or `triangle`.
  `glyph` is one character drawn in the middle.

Then add its Codex text to `data/codex.json`, and a sprite if you have one (below).
Run `python tools/sim.py` to see how it changes difficulty.

## Sprites (enemy and ship art)

Put images in `assets/sprites/`, named after what they replace:

- an enemy id: `bug.png`, `daemon.png`, `brute.png`, or your own enemy like `glitch.png`
- `player.png` for your ship, or `player-lumen.png` (also `-signal`, `-hex`, `-bastion`) for one operator

Lancers, Watchers, Eels, Ghosts and bosses keep their drawn look on purpose: it shows aim lines, segments or
visibility that the player has to read. Wardens and Patchers keep their shield arc and patch label on top of the art.

Format: PNG with a transparent background, SVG or WebP. 64–128 px square is plenty; keep each under 100 KB,
because images are embedded in the page. Draw the ship facing right.

Optional per-sprite settings in `data/sprites.json`:

```json
{ "bug": { "scale": 1.2, "rotate": "face" }, "player": { "scale": 1.1 } }
```

`scale` resizes the art (1 = the enemy's normal size). `rotate`: `"face"` turns it toward you, `"spin"` spins it.

## Icons

Put images in `assets/icons/`, named after the id of a weapon (`data/weapons.json`), system
(`data/systems.json`) or power (`data/powers.json` → `powers`), e.g. `bolt.png`, `might.png`, `blink.png`.
They appear on upgrade cards, build slots, power buttons and the damage report. Square, around 64 px, under 50 KB.

## Music

Put tracks in `assets/music/`:

| File | Plays during |
|---|---|
| `calm.ogg` | quiet moments |
| `action.ogg` | crowds and purge waves |
| `boss.ogg` | boss fights |
| `theme.ogg` | everything, if it's the only track |

Missing tracks fall back to the nearest one. With no files, the generated soundtrack plays as before.
Tracks use the Music volume slider and dip briefly under big moments like the generated music.
OGG or MP3 (M4A and WAV work too), loop cleanly, ~96–128 kbps, under 3 MB each.
Music is kept as separate files next to `index.html`, so it works on GitHub Pages and in Telegram
but not in the Claude artifact, which keeps the generated soundtrack.

## Weapons, systems and other tables

| File | Contents |
|---|---|
| `weapons.json` | name, icon, per-level descriptions and stats (each list has one value per level) |
| `systems.json` | passive systems |
| `evolutions.json` | which system each weapon needs to evolve, and the evolution's name |
| `powers.json` | powers (`powers`) and their level texts (`levels`) |
| `bosses.json` | boss names (`info`) and when they arrive (`schedule`, in seconds) |
| `overflow.json` | stats offered once everything is maxed |
| `relay.json` | everything the Relay says |
| `story.json` | story chapters |
| `modes.json` | modes, their notes and daily modifiers |
| `run-extras.json` | sectors, boss abilities, mutations, specializations, quests, halos |
| `styles.json` | rain glyph styles |

Numbers here change balance directly. Weapon effects themselves (what a level does) are code in `src/js/17-weapons.js`.

## Translations (Russian, Hebrew)

English is written in the code and in `data/`. Other languages live in `i18n/<language>/` (`ru`, `he`):

| File | Contents |
|---|---|
| `i18n/ru/data/<file>.json` | the texts of `data/<file>.json`, each as `{"en": "...", "ru": "..."}` |
| `i18n/ru/ui.json` | everything else on screen. `text`: exact texts. `patterns`: texts with values, `{0}` any value, `{#0}` a number only; Russian plural forms as `{0\|строка\|строки\|строк}`. `html`: whole paragraphs with their tags. `fragments`: pieces of messages the code glues together. |

After changing or adding English text:

    python tools/i18n.py extract ru      adds new texts with an empty translation; existing ones are kept
    python tools/i18n.py check ru        lists what is still untranslated
    python tools/i18n_scan.py ru         plays the game in Russian and lists any English left on screen

An empty translation shows the English text, so nothing breaks while a translation is missing. A `null`
translation marks something that isn't on-screen text (a key name, a CSS value). If you change an
English text in `data/`, its old translation is dropped on the next `extract`, because it no longer matches.
Code-line syntax like `on_kill → burst()` stays in English in every language.

Hebrew is shown right to left (`dir="rtl"`); code lines stay left to right inside it. The play screen keeps
its layout so the pause and power buttons stay where thumbs expect them. Hebrew plurals are `{0|שורה|שורות}`.
To add a language: `python tools/i18n.py extract <code>`, translate, and add it to the language list in
`src/js/24-story-goals-siege-core-and-turrets.js` (LANGS).

## Checking balance

    pip install playwright && python -m playwright install chromium   (once)
    python tools/sim.py                  3 full runs
    python tools/sim.py --runs 6         more runs = more reliable

The bot isn't a good player; compare the numbers before and after a change, not with your own runs.

## Publishing

Push to `main`. GitHub Actions runs `check.py`, builds the site and publishes it to GitHub Pages
(repository Settings → Pages → Source must be "GitHub Actions"). Telegram picks it up the next time
the Mini App is opened.

The Claude artifact version is `dist/claude-artifact.html` after a build; publish it there when you want
the Claude version updated too.
