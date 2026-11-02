#!/usr/bin/env python3
"""Check data/ and assets/ for mistakes before building.

    python tools/check.py

Errors (exit code 1) are things that would break the game; warnings are worth a look.
Only the Python standard library is needed.
"""
import json
import pathlib
import struct
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA, ASSETS = ROOT / 'data', ROOT / 'assets'
errors, warnings = [], []
err, warn = errors.append, warnings.append

IMAGE_EXT = {'.png', '.svg', '.webp', '.jpg', '.jpeg', '.gif'}
AUDIO_EXT = {'.mp3', '.ogg', '.m4a', '.wav'}
# enemy types the game draws itself and that can't take a sprite (their look shows aim lines, segments or visibility)
NO_SPRITE = {'lancer', 'watcher', 'eel', 'ghost', 'boss', 'root', 'auditor', 'collector', 'mirror', 'phantom'}
OPERATORS = {'signal', 'lumen', 'hex', 'bastion'}
MUSIC = {'calm', 'action', 'boss', 'theme'}


def load(name):
    p = DATA / f'{name}.json'
    if not p.exists():
        err(f'data/{name}.json is missing')
        return {}
    try:
        return json.loads(p.read_text(encoding='utf-8'))
    except json.JSONDecodeError as e:
        err(f'data/{name}.json is not valid JSON: line {e.lineno}, column {e.colno}: {e.msg}')
        return {}


def num(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def png_size(p):
    b = p.read_bytes()[:24]
    if b[:8] == b'\x89PNG\r\n\x1a\n':
        return struct.unpack('>II', b[16:24])
    return None


def main():
    for p in sorted(DATA.glob('*.json')):
        try:
            json.loads(p.read_text(encoding='utf-8'))
        except json.JSONDecodeError as e:
            err(f'{p.relative_to(ROOT)} is not valid JSON: line {e.lineno}, column {e.colno}: {e.msg}')
    if errors:
        return report()

    enemies, codex, bosses = load('enemies'), load('codex'), load('bosses')
    weapons, systems, evolutions, powers = load('weapons'), load('systems'), load('evolutions'), load('powers')
    sprites_opts = json.loads((DATA / 'sprites.json').read_text(encoding='utf-8')) if (DATA / 'sprites.json').exists() else {}

    # enemies
    for eid, d in enemies.items():
        for f in ('hp', 'spd', 'r', 'dmg', 'xp'):
            if not num(d.get(f)):
                err(f'enemies.{eid}: "{f}" must be a number')
            elif d[f] < 0:
                err(f'enemies.{eid}: "{f}" can\'t be negative')
        s = d.get('spawn')
        if s is not None:
            if not isinstance(s, dict):
                err(f'enemies.{eid}: "spawn" must be an object like {{"from": 300, "weight": 1}}')
            else:
                for f in ('from', 'weight', 'ramp', 'max'):
                    if f in s and not num(s[f]):
                        err(f'enemies.{eid}.spawn: "{f}" must be a number')
                if 'modes' in s and not (isinstance(s['modes'], list) and all(isinstance(m, str) for m in s['modes'])):
                    err(f'enemies.{eid}.spawn: "modes" must be a list like ["full", "short"]')
                if eid not in codex:
                    warn(f'enemies.{eid}: new enemy has no Codex entry; add "{eid}": ["Name", "Description"] to data/codex.json')
        look = d.get('look')
        if look is not None:
            if look.get('shape', 'circle') not in ('circle', 'square', 'diamond', 'triangle'):
                err(f'enemies.{eid}.look: "shape" must be circle, square, diamond or triangle')
    for cid in codex:
        if cid not in enemies:
            warn(f'codex.{cid}: no enemy with this id in data/enemies.json')
    for t, b in bosses.get('schedule', []):
        if b not in enemies:
            err(f'bosses.schedule: unknown boss "{b}" at {t} s')

    # weapons: per-level arrays must match the number of levels in "desc"
    for wid, w in weapons.items():
        levels = len(w.get('desc', []))
        for f, v in w.items():
            if isinstance(v, list) and f != 'desc' and len(v) != levels:
                err(f'weapons.{wid}: "{f}" has {len(v)} values but "desc" has {levels} levels')
    for wid, e in evolutions.items():
        if wid not in weapons:
            err(f'evolutions.{wid}: no weapon with this id')
        if e.get('need') not in systems:
            err(f'evolutions.{wid}: partner system "{e.get("need")}" doesn\'t exist')
    for wid in weapons:
        if wid not in evolutions:
            warn(f'weapons.{wid}: has no evolution in data/evolutions.json')

    # telemetry
    tele = json.loads((DATA / 'telemetry.json').read_text(encoding='utf-8')) if (DATA / 'telemetry.json').exists() else {}
    url = tele.get('database_url', '')
    if url and not (url.startswith('https://') and ('.firebaseio.com' in url or '.firebasedatabase.app' in url)):
        err('telemetry.database_url: expected a Firebase Realtime Database address like https://<name>-default-rtdb.firebaseio.com')
    if url.endswith('.json') or '?' in url:
        err('telemetry.database_url: use the bare database address, without a path, ".json" or "?"')
    key = tele.get('api_key', '')
    if key and not (isinstance(key, str) and key.startswith('AIza') and 30 <= len(key) <= 50):
        err('telemetry.api_key: expected the Firebase Web API key (Project settings → General), which starts with "AIza"')
    if url and not key:
        warn('telemetry: no "api_key", so players are not signed in and anyone can change any leaderboard entry (see docs/MONITORING.md → Security)')
    if 'heartbeat_seconds' in tele and not (num(tele['heartbeat_seconds']) and 15 <= tele['heartbeat_seconds'] <= 300):
        err('telemetry.heartbeat_seconds: use a number between 15 and 300')

    # assets
    ids_icons = set(weapons) | set(systems) | set(powers.get('powers', {}))
    sprite_ids = set()
    for kind in ('sprites', 'icons', 'music'):
        folder = ASSETS / kind
        if not folder.exists():
            continue
        for p in sorted(folder.iterdir()):
            if p.name.startswith('.') or p.name.lower() == 'readme.md':
                continue
            ext, size = p.suffix.lower(), p.stat().st_size
            rel = p.relative_to(ROOT)
            if kind == 'music':
                if ext not in AUDIO_EXT:
                    err(f'{rel}: music must be .ogg, .mp3, .m4a or .wav')
                elif p.stem not in MUSIC:
                    warn(f'{rel}: the game plays calm, action, boss or theme; this file name won\'t be used')
                if size > 6 * 1024 * 1024:
                    warn(f'{rel}: {size / 1048576:.1f} MB is large for phones; aim for under 3 MB (OGG/MP3 around 96–128 kbps)')
                continue
            if ext not in IMAGE_EXT:
                err(f'{rel}: images must be .png, .svg, .webp, .jpg or .gif')
                continue
            if size > 200 * 1024:
                warn(f'{rel}: {size // 1024} KB; images are embedded in the page, so keep each under ~100 KB')
            dim = png_size(p) if ext == '.png' else None
            if dim and max(dim) > 256:
                warn(f'{rel}: {dim[0]}×{dim[1]} px; {"128" if kind == "sprites" else "64"} px or less is plenty and keeps the page small')
            if kind == 'sprites':
                sprite_ids.add(p.stem)
                if p.stem in NO_SPRITE:
                    warn(f'{rel}: {p.stem} keeps its drawn look (it shows warnings the player must read); this sprite isn\'t used')
                elif p.stem not in enemies and p.stem != 'player' and not (p.stem.startswith('player-') and p.stem[7:] in OPERATORS):
                    warn(f'{rel}: no enemy called "{p.stem}"; sprites are named after an enemy id, "player" or "player-<operator>"')
            elif p.stem not in ids_icons:
                warn(f'{rel}: no weapon, system or power called "{p.stem}"')
    for sid, o in sprites_opts.items():
        if sid not in sprite_ids:
            warn(f'sprites.{sid}: options for a sprite that isn\'t in assets/sprites/')
        if 'rotate' in o and o['rotate'] not in ('face', 'spin', None):
            err(f'sprites.{sid}: "rotate" must be "face" or "spin"')
        if 'scale' in o and not num(o['scale']):
            err(f'sprites.{sid}: "scale" must be a number')
    return report()


def report():
    for w in warnings:
        print('warning:', w)
    for e in errors:
        print('ERROR:  ', e)
    print(f'{len(errors)} error(s), {len(warnings)} warning(s)')
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
