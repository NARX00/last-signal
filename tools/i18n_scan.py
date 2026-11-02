#!/usr/bin/env python3
"""Play the game in another language and list on-screen text that is still in English.

    python tools/i18n_scan.py ru                 menus, a bot-played 6-minute full run, siege and story
    python tools/i18n_scan.py ru --minutes 15

Needs Playwright (see tools/sim.py). It rebuilds dist/sim.html first.
It records page text (after translation) and every label drawn on the game canvas, then prints
the texts that still contain English words, most frequent first. Code-line syntax such as
on_kill → split() and names like "Last Signal" are expected to stay in English.
"""
import argparse
import asyncio
import json
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = 'http://last-signal.test/'
KEEP = re.compile(r'^(?:Last Signal(?:: Rewrite)?|// rewrite|LS1\..*|[A-Z]{1,4}|Esc|Enter|WASD|Q|E|F|G|T|V|R|B|X|P|MVP|EMP|Telegram|Claude|Firebase|English|[◆◬▲•·\d\s.,:%/×+\-−→()]+)$')
LATIN = re.compile(r'[A-Za-z]{3,}')
# English that stays: the game's name, code-line syntax like every(8 hits) → split(), key names
STRIP = re.compile(r'Last Signal(?:: Rewrite)?|// rewrite|LS1\.\S*|[A-Za-z_.]*\w\([^)]*\)|\bon_\w+|\bif\(\w+\)|\b(?:WASD|Esc|Space|Enter|Telegram|Claude|MVP|EMP|crowded|boss|low|high|moving|still|elite|hits?)\b')

INIT = """
(() => {
  try { localStorage.setItem('last-signal-settings', JSON.stringify({ lang: '%LANG%', stats: false })); } catch (_) {}
  window.__seen = new Map();
  const add = (s, where) => { if (typeof s !== 'string') return; s = s.replace(/\\s+/g, ' ').trim(); if (!/[A-Za-z]{3}/.test(s)) return; const k = where + '\\t' + s; window.__seen.set(k, (window.__seen.get(k) || 0) + 1); };
  window.__add = add;
  const ft = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (t, ...a) { add(String(t), 'canvas'); return ft.call(this, t, ...a); };
})();
"""

COLLECT = """
(() => {
  const walk = el => {
    if (el.closest && el.closest('script,style,[data-noi18n]')) return;
    for (const a of ['title', 'aria-label', 'placeholder']) if (el.getAttribute && el.getAttribute(a)) __add(el.getAttribute(a), 'attr');
    for (const k of el.childNodes) k.nodeType === 1 ? walk(k) : k.nodeType === 3 && __add(k.nodeValue, 'page');
  };
  walk(document.body); return 0;
})()
"""


async def scan(lang, minutes):
    subprocess.run([sys.executable, str(ROOT / 'tools' / 'build.py'), '--sim'], check=True, stdout=subprocess.DEVNULL)
    html = (ROOT / 'dist' / 'sim.html').read_text(encoding='utf-8')
    from playwright.async_api import async_playwright
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        errors = []

        async def page_for():
            page = await browser.new_page(viewport={'width': 390, 'height': 844})
            page.on('pageerror', lambda e: errors.append(str(e)[:300]))
            await page.route(URL, lambda r: r.fulfill(body=html, content_type='text/html'))
            await page.add_init_script(INIT.replace('%LANG%', lang))
            await page.goto(URL)
            await page.wait_for_timeout(600)
            return page

        found = {}

        async def harvest(page):
            await page.evaluate(COLLECT)
            for k, n in json.loads(await page.evaluate('JSON.stringify([...__seen])')):
                found[k] = found.get(k, 0) + n

        page = await page_for()
        assert await page.evaluate('document.documentElement.lang') == lang, 'language was not picked up'
        for tab in await page.evaluate("[...document.querySelectorAll('[data-tab]')].map(b => b.dataset.tab)"):
            await page.evaluate(f"document.querySelector('[data-tab=\"{tab}\"]').click(); 0")
            await page.wait_for_timeout(150)
        await page.wait_for_timeout(1500)
        await harvest(page)
        ev = lambda code: page.evaluate('c => __sim.ev(c)', code)
        for mode, mins in (('full', minutes), ('siege', 2), ('story', 2), ('daily', 1)):
            if mode == 'daily':
                await ev("$('dailyBtn') && $('dailyBtn').click(); 0")
                await page.wait_for_timeout(800)
                await harvest(page)
                continue
            await ev(f"window.__simOp = true; __sim.start('{mode}'); 0")
            for s in range(mins * 6):
                await ev('__sim.run(10); render(1/30); 0')
                if s % 6 == 0:
                    for screen in ('pauseGame()', "openEditor && openEditor()", "state='play'; openLevelUp()"):
                        try:
                            await ev(f'try {{ {screen} }} catch (_) {{}}; 0')
                            await page.wait_for_timeout(50)
                            await harvest(page)
                        except Exception:
                            pass
                    await ev("document.querySelectorAll('.screen').forEach(s => { if (s.id !== 'title') s.hidden = true; }); state = 'simpause'; 0")
                await harvest(page)
            await ev("try { endRun(false) } catch (_) {}; 0")
            await page.wait_for_timeout(400)
            await harvest(page)
        await browser.close()

    left = {}
    for k, n in found.items():
        where, s = k.split('\t', 1)
        if KEEP.match(s) or not LATIN.search(STRIP.sub('', s)):
            continue
        left[(where, s)] = left.get((where, s), 0) + n
    for (where, s), n in sorted(left.items(), key=lambda x: -x[1]):
        print(f'{where:6} {n:6}  {s[:160]}')
    print(f'{len(left)} English text(s) left' + (f', {len(errors)} page error(s):' if errors else ''))
    for e in errors[:10]:
        print('  ', e)
    return 1 if errors else 0


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('lang')
    ap.add_argument('--minutes', type=int, default=6)
    a = ap.parse_args()
    sys.exit(asyncio.run(scan(a.lang, a.minutes)))
