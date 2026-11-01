#!/usr/bin/env python3
"""Render assets/brand/icon.svg into the PNG sizes the site and Telegram use.

    python tools/render_icon.py

Needs Playwright (pip install playwright && python -m playwright install chromium).
Outputs: icon-512.png (Telegram bot picture), icon-192.png (site icon), icon-180.png (iPhone home screen),
icon-32.png (browser tab), and banner-640x360.png (Telegram Mini App cover).
"""
import asyncio
import pathlib

BRAND = pathlib.Path(__file__).resolve().parent.parent / 'assets' / 'brand'


async def main():
    from playwright.async_api import async_playwright
    svg = (BRAND / 'icon.svg').read_text(encoding='utf-8')
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for size in (512, 192, 180, 32):
            pg = await b.new_page(viewport={'width': size, 'height': size}, device_scale_factor=1)
            await pg.set_content(f'<html><body style="margin:0;background:transparent">'
                                 f'<div style="width:{size}px;height:{size}px">{svg.replace("<svg ", f"<svg style=\'width:{size}px;height:{size}px\' ", 1)}</div></body></html>')
            await pg.screenshot(path=str(BRAND / f'icon-{size}.png'), omit_background=True)
            await pg.close()
        # Mini App cover: icon on the left, title on the right
        pg = await b.new_page(viewport={'width': 640, 'height': 360})
        await pg.set_content(
            '<html><body style="margin:0;width:640px;height:360px;display:flex;align-items:center;gap:34px;padding:0 44px;box-sizing:border-box;'
            'background:radial-gradient(ellipse at 30% 50%,#0f3a40,#02080d 75%);font-family:Impact,\'Arial Narrow\',sans-serif;color:#f0fbff">'
            f'<div style="width:220px;height:220px;flex:none">{svg.replace("<svg ", "<svg style=\'width:220px;height:220px\' ", 1)}</div>'
            '<div><div style="font-size:64px;line-height:.9;letter-spacing:-.02em">LAST<br>SIGNAL</div>'
            '<div style="margin-top:14px;font:15px Menlo,Consolas,monospace;letter-spacing:.3em;color:#61f5c0">// REWRITE</div></div></body></html>')
        await pg.screenshot(path=str(BRAND / 'banner-640x360.png'))
        await b.close()
    print('rendered:', ', '.join(sorted(p.name for p in BRAND.glob('*.png'))))


if __name__ == '__main__':
    asyncio.run(main())
