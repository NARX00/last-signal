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
import hashlib
import json
import mimetypes
import pathlib
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, DATA, ASSETS, DIST = ROOT / 'src', ROOT / 'data', ROOT / 'assets', ROOT / 'dist'

TITLE = 'Last Signal: Rewrite'
FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=VT323&family=PT+Mono&family=Noto+Sans+Hebrew:wght@400;600&display=swap">'
SITE_URL = 'https://narx00.github.io/last-signal/'
ICONS = (
    '<link rel="icon" type="image/png" sizes="32x32" href="assets/brand/icon-32.png">'
    '<link rel="icon" type="image/png" sizes="192x192" href="assets/brand/icon-192.png">'
    '<link rel="apple-touch-icon" href="assets/brand/icon-180.png">'
    '<meta name="theme-color" content="#030b12">'
    '<meta property="og:title" content="Last Signal">'
    '<meta property="og:description" content="A survival game in the code rain. Program your weapons, outlast the swarm, delete the Root Process.">'
    f'<meta property="og:image" content="{SITE_URL}assets/brand/banner-640x360.png">'
)
TELEGRAM_HEAD = (
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><!--CSP-->'
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">'
    '<meta name="color-scheme" content="dark">' + ICONS + '<style>body{margin:0}[hidden]{display:none!important}</style>'
    '<script src="https://telegram.org/js/telegram-web-app.js"></script></head><body>\n'
)
TELEGRAM_TAIL = '</body></html>\n'

IMAGE_EXT = {'.png', '.svg', '.webp', '.jpg', '.jpeg', '.gif'}
AUDIO_EXT = {'.mp3', '.ogg', '.m4a', '.wav'}
MARKER = '/*@@BUILD_DATA@@*/'


def csp(page, game=True):
    """Content-Security-Policy for a published page: scripts only the page's own (by their sha256 hash) and,
    for the game, Telegram's; network only to the Firebase database and Google's sign-in service."""
    import re
    hashes = ' '.join("'sha256-" + base64.b64encode(hashlib.sha256(m.encode()).digest()).decode() + "'"
                      for m in re.findall(r'<script>(.*?)</script>', page, re.S))
    tele = json.loads((DATA / 'telemetry.json').read_text(encoding='utf-8')) if (DATA / 'telemetry.json').exists() else {}
    db = str(tele.get('database_url', '')).rstrip('/')
    connect = ' '.join(x for x in ("'self'", db, 'https://identitytoolkit.googleapis.com https://securetoken.googleapis.com' if tele.get('api_key') else '') if x)
    parts = [
        "default-src 'self'",
        f"script-src {hashes}" + (' https://telegram.org' if game else ''),
        "style-src 'self' 'unsafe-inline'" + (' https://fonts.googleapis.com' if game else ''),
        "font-src 'self' data:" + (' https://fonts.gstatic.com' if game else ''),
        "img-src 'self' data: blob:",
        "media-src 'self' data: blob:",
        f'connect-src {connect}',
        "object-src 'none'", "base-uri 'none'", "form-action 'none'",
    ]
    return '<meta http-equiv="Content-Security-Policy" content="' + '; '.join(parts) + '">'


def read_parts(folder, pattern):
    return ''.join(p.read_text(encoding='utf-8') for p in sorted(folder.glob(pattern)))


def load_data():
    """Every data/*.json file becomes BUILD.data['<file stem>']."""
    return {p.stem: json.loads(p.read_text(encoding='utf-8')) for p in sorted(DATA.glob('*.json'))}


def load_i18n():
    """i18n/<lang>/data/*.json and ui.json; only filled-in translations are shipped."""
    out = {}
    for d in sorted((ROOT / 'i18n').glob('*/')):
        if not (d / 'ui.json').exists():
            continue
        ui = json.loads((d / 'ui.json').read_text(encoding='utf-8'))
        ui = {sec: {k: v for k, v in items.items() if v} for sec, items in ui.items()}
        data = {p.stem: json.loads(p.read_text(encoding='utf-8')) for p in sorted((d / 'data').glob('*.json'))}
        out[d.name] = {'ui': ui, 'data': data}
    return out


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
    data = load_data()
    if not with_music:   # the Claude artifact: no files next to it, and no telemetry
        data['telemetry'] = {}
    version = hashlib.sha256((css + markup + js + json.dumps(data, sort_keys=True)).encode()).hexdigest()[:8]
    payload = json.dumps({'data': data, 'assets': load_assets(with_music), 'version': version, 'i18n': load_i18n()}, ensure_ascii=False, separators=(',', ':'))
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
    (out / 'assets' / 'brand').mkdir(parents=True)
    for p in sorted((ASSETS / 'brand').glob('*.png')):
        shutil.copy2(p, out / 'assets' / 'brand' / p.name)
    (out / 'monitor.html').write_text(build_monitor(), encoding='utf-8')


def build_monitor():
    """monitor.html: the live dashboard, reading the same database the game reports to."""
    tele = load_data().get('telemetry', {})
    page = (SRC / 'monitor.html').read_text(encoding='utf-8')
    page = page.replace('/*@@MONITOR_CONFIG@@*/', 'const CONFIG = ' + json.dumps(tele) + ';', 1)
    return page.replace('<meta charset="utf-8">', '<meta charset="utf-8">' + csp(page, game=False), 1)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--check', action='store_true', help='fail if index.html is out of date')
    ap.add_argument('--sim', action='store_true', help='also build dist/sim.html for tools/sim.py')
    args = ap.parse_args()
    game = build_game()
    site = TELEGRAM_HEAD.replace('<!--CSP-->', csp(game)) + game + TELEGRAM_TAIL
    if args.check:
        current = (ROOT / 'index.html').read_text(encoding='utf-8') if (ROOT / 'index.html').exists() else ''
        mon = (ROOT / 'monitor.html').read_text(encoding='utf-8') if (ROOT / 'monitor.html').exists() else ''
        if current != site or mon != build_monitor():
            print('index.html or monitor.html is out of date: run  python tools/build.py  and commit the result.')
            return 1
        print('index.html is up to date.')
        return 0
    (ROOT / 'index.html').write_text(site, encoding='utf-8')
    (ROOT / 'monitor.html').write_text(build_monitor(), encoding='utf-8')
    DIST.mkdir(exist_ok=True)
    write_site(site)
    # the Claude artifact can't load files next to it, so it keeps the generated music
    artifact = build_game(with_music=False)
    (DIST / 'claude-artifact.html').write_text(artifact, encoding='utf-8')
    print(f'index.html                 {len(site.encode()) / 1024:6.0f} KB  GitHub Pages / Telegram')
    print(f'monitor.html                          live monitoring page')
    print(f'dist/site/                            the same, with assets/music, for GitHub Actions')
    print(f'dist/claude-artifact.html  {len(artifact.encode()) / 1024:6.0f} KB  Claude artifact')
    if args.sim:
        hook = (ROOT / 'tools' / 'sim_hook.js').read_text(encoding='utf-8')
        sim = TELEGRAM_HEAD.replace('<!--CSP-->', '').replace('<script src="https://telegram.org/js/telegram-web-app.js"></script>', '') + build_game(sim_hook=hook) + TELEGRAM_TAIL
        (DIST / 'sim.html').write_text(sim, encoding='utf-8')
        print('dist/sim.html                         test build for tools/sim.py')
    return 0


if __name__ == '__main__':
    sys.exit(main())
