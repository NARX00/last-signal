#!/usr/bin/env python3
"""Build Last Signal from src/, data/ and assets/.

    python tools/build.py           build index.html (GitHub Pages + Telegram), dist/site/ and dist/claude-artifact.html
    python tools/build.py --check   exit 1 if the committed index.html is not what the sources build
    python tools/build.py --sim     also build dist/sim.html, the page tools/sim.py drives

The game ships as one HTML file so it runs anywhere: GitHub Pages, a Telegram Mini App,
a Claude artifact, or opened straight from disk. Source files are concatenated in name
order (00-, 01-, 02a-, ...), so the JS parts share one scope exactly as one script did.
Images are embedded in the page; music stays as files in assets/music/ next to it.
"""
import argparse
import base64
import json
import mimetypes
import pathlib
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, DATA, ASSETS, DIST = ROOT / 'src', ROOT / 'data', ROOT / 'assets', ROOT / 'dist'

TITLE = 'Last Signal: Rewrite'
FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=VT323&display=swap">'
TELEGRAM_HEAD = (
    '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">'
    '<meta name="color-scheme" content="dark"><style>body{margin:0}[hidden]{display:none!important}</style>'
    '<script src="https://telegram.org/js/telegram-web-app.js"></script></head><body>\n'
)
TELEGRAM_TAIL = '</body></html>\n'

IMAGE_EXT = {'.png', '.svg', '.webp', '.jpg', '.jpeg', '.gif'}
AUDIO_EXT = {'.mp3', '.ogg', '.m4a', '.wav'}
MARKER = '/*@@BUILD_DATA@@*/'


def read_parts(folder, pattern):
    return ''.join(p.read_text(encoding='utf-8') for p in sorted(folder.glob(pattern)))


def load_data():
    """Every data/*.json file becomes BUILD.data['<file stem>']."""
    return {p.stem: json.loads(p.read_text(encoding='utf-8')) for p in sorted(DATA.glob('*.json'))}


def load_assets(with_music=True):
    """assets/sprites and assets/icons become data URIs; assets/music becomes relative URLs."""
    out = {'sprites': {}, 'icons': {}, 'music': {}}
    for kind in ('sprites', 'icons'):
        for p in sorted((ASSETS / kind).glob('*')):
            if p.suffix.lower() in IMAGE_EXT:
                mime = 'image/svg+xml' if p.suffix.lower() == '.svg' else (mimetypes.guess_type(p.name)[0] or 'application/octet-stream')
                out[kind][p.stem] = f'data:{mime};base64,' + base64.b64encode(p.read_bytes()).decode()
    if with_music:
        for p in sorted((ASSETS / 'music').glob('*')):
            if p.suffix.lower() in AUDIO_EXT:
                out['music'][p.stem] = f'assets/music/{p.name}'
    return out


def build_game(with_music=True, sim_hook=''):
    """The game itself: title, styles, markup and script. On its own, this is also the Claude artifact."""
    css = read_parts(SRC / 'styles', '*.css')
    markup = (SRC / 'body.html').read_text(encoding='utf-8')
    js = read_parts(SRC / 'js', '*.js')
    payload = json.dumps({'data': load_data(), 'assets': load_assets(with_music)}, ensure_ascii=False, separators=(',', ':'))
    if js.count(MARKER) != 1:
        raise SystemExit(f'src/js must contain {MARKER} exactly once (it sits in 00-prelude.js)')
    js = js.replace(MARKER, f'const BUILD = {payload};', 1)
    if sim_hook:   # the test bot needs to run inside the game's scope, so it goes in before the closing "})();"
        cut = js.rstrip().rfind('})();')
        js = js[:cut] + sim_hook + '\n' + js[cut:]
    return f'<title>{TITLE}</title>\n<style>\n{css}</style>\n{FONTS}\n{markup}<script>\n{js}</script>\n'


def write_site(site):
    """dist/site: what GitHub Pages serves when it deploys from GitHub Actions."""
    out = DIST / 'site'
    if out.exists():
        shutil.rmtree(out)
    (out / 'assets' / 'music').mkdir(parents=True)
    (out / 'index.html').write_text(site, encoding='utf-8')
    for p in sorted((ASSETS / 'music').glob('*')):
        if p.suffix.lower() in AUDIO_EXT:
            shutil.copy2(p, out / 'assets' / 'music' / p.name)
    (out / '.nojekyll').write_text('')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--check', action='store_true', help='fail if index.html is out of date')
    ap.add_argument('--sim', action='store_true', help='also build dist/sim.html for tools/sim.py')
    args = ap.parse_args()
    site = TELEGRAM_HEAD + build_game() + TELEGRAM_TAIL
    if args.check:
        current = (ROOT / 'index.html').read_text(encoding='utf-8') if (ROOT / 'index.html').exists() else ''
        if current != site:
            print('index.html is out of date: run  python tools/build.py  and commit the result.')
            return 1
        print('index.html is up to date.')
        return 0
    (ROOT / 'index.html').write_text(site, encoding='utf-8')
    DIST.mkdir(exist_ok=True)
    write_site(site)
    # the Claude artifact can't load files next to it, so it keeps the generated music
    artifact = build_game(with_music=False)
    (DIST / 'claude-artifact.html').write_text(artifact, encoding='utf-8')
    print(f'index.html                 {len(site.encode()) / 1024:6.0f} KB  GitHub Pages / Telegram')
    print(f'dist/site/                            the same, with assets/music, for GitHub Actions')
    print(f'dist/claude-artifact.html  {len(artifact.encode()) / 1024:6.0f} KB  Claude artifact')
    if args.sim:
        hook = (ROOT / 'tools' / 'sim_hook.js').read_text(encoding='utf-8')
        sim = TELEGRAM_HEAD.replace('<script src="https://telegram.org/js/telegram-web-app.js"></script>', '') + build_game(sim_hook=hook) + TELEGRAM_TAIL
        (DIST / 'sim.html').write_text(sim, encoding='utf-8')
        print('dist/sim.html                         test build for tools/sim.py')
    return 0


if __name__ == '__main__':
    sys.exit(main())
