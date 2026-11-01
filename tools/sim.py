#!/usr/bin/env python3
"""Play the game with a simple bot to check balance after a change.

    python tools/sim.py                      3 full 15-minute runs, side by side
    python tools/sim.py --runs 6 --minutes 8 --mode short
    python tools/sim.py --mode full:3        Protocol 3 (mode:protocol[:operator])

Needs Playwright:  pip install playwright  &&  python -m playwright install chromium
It rebuilds dist/sim.html first, so it always tests your current sources.

The bot kites away from crowds, collects shards and always takes the "best" card by a fixed
score. It isn't a good player: compare numbers between versions, not with your own runs.
Deaths are counted as revives (the bot can't really die), so they measure how much damage got through.
Runs vary a lot: use 6 or more runs before trusting a difference.
"""
import argparse
import asyncio
import json
import pathlib
import statistics
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


async def one_run(browser, page_html, mode, minutes, idx):
    page = await browser.new_page(viewport={'width': 390, 'height': 844})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)[:200]))
    await page.set_content(page_html)
    await page.wait_for_timeout(500)
    ev = lambda code: page.evaluate('c => __sim.ev(c)', code)
    await ev(f'window.__simOp = true; __sim.start({json.dumps(mode)}); 0')
    rows = []
    for m in range(minutes):
        r = json.loads(await ev('JSON.stringify(__sim.run(60))'))
        rows.append(r)
        print(f'  run {idx + 1}  {r["t"] // 60:2d}:00  level {r["lv"]:3d}  deaths {r["deaths"]:3d}  evolutions {r["evo"]}  '
              f'bosses {r["bosses"]}  code {r["codePct"]:3d}%', flush=True)
        if r['t'] < (m + 1) * 60 - 1:
            break
    await page.close()
    total = sum(r['deaths'] for r in rows)
    return {'deaths': total, 'level': rows[-1]['lv'], 'evo': rows[-1]['evo'], 'bosses': rows[-1]['bosses'],
            'root': rows[-1]['root'], 'code': rows[-1]['codePct'], 'secs': rows[-1]['t'], 'errors': errors}


async def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--runs', type=int, default=3)
    ap.add_argument('--minutes', type=int, default=15)
    ap.add_argument('--mode', default='full', help='full, short, siege… optionally :protocol[:operator]')
    args = ap.parse_args()
    subprocess.run([sys.executable, str(ROOT / 'tools' / 'build.py'), '--sim'], check=True, stdout=subprocess.DEVNULL)
    html = (ROOT / 'dist' / 'sim.html').read_text(encoding='utf-8')
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        print('Playwright is missing:  pip install playwright  &&  python -m playwright install chromium')
        return 1
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        results = await asyncio.gather(*[one_run(browser, html, args.mode, args.minutes, i) for i in range(args.runs)])
        await browser.close()
    deaths = [r['deaths'] for r in results]
    print(f'\n{args.runs} runs of {args.mode} · {args.minutes} min')
    for i, r in enumerate(results):
        print(f'  run {i + 1}: deaths {r["deaths"]:3d} · level {r["level"]} · evolutions {r["evo"]} · bosses {r["bosses"]}'
              f' · code {r["code"]}%' + (' · ROOT DELETED' if r['root'] else '') + (f' · errors: {r["errors"]}' if r['errors'] else ''))
    print(f'deaths: mean {statistics.mean(deaths):.1f}' + (f', spread ±{statistics.pstdev(deaths):.1f}' if len(deaths) > 1 else ''))
    return 1 if any(r['errors'] for r in results) else 0


if __name__ == '__main__':
    sys.exit(asyncio.run(main()))
