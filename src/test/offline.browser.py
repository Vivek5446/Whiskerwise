"""Real offline checks against a production build served locally.

Run: build, serve dist with wrangler on :4173, then `python3 src/test/offline.browser.py`.
Uses Playwright's network cut (context.set_offline), so requests truly fail.
"""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

BASE = 'http://127.0.0.1:4173'
OUT = Path('/tmp/browser/offline')
OUT.mkdir(parents=True, exist_ok=True)


async def solve_with_hints(page, name):
    cells = page.get_by_role('gridcell')
    await cells.first.wait_for()
    size = int((await cells.count()) ** .5)
    win = page.get_by_role('dialog', name=name)
    for _ in range(size + 2):
        if await win.count():
            break
        try:
            await page.get_by_role('button', name='Hint', exact=False).click(timeout=5000)
        except Exception:
            await page.screenshot(path=str(OUT / 'hint_fail.png'))
            raise
        await page.wait_for_timeout(400)
    await win.wait_for()
    return win


async def run(p, width, height, touch):
    browser = await p.chromium.launch(headless=True)
    ctx = await browser.new_context(viewport={'width': width, 'height': height}, has_touch=touch, timezone_id='Asia/Kolkata')
    page = await ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    tag = f'{width}'

    # First install while online.
    await page.goto(BASE, wait_until='networkidle')
    await page.evaluate("""() => {
      localStorage.setItem('purrzle.tutorial.v1','done');
      localStorage.setItem('purrzle.settings', JSON.stringify({sound:true,reducedMotion:false,showConflicts:true,music:false}));
    }""")
    await page.wait_for_function("navigator.serviceWorker.controller !== null", timeout=20000)
    await page.wait_for_function("""async () => { for (const n of await caches.keys())
      for (const r of await (await caches.open(n)).keys()) if (new URL(r.url).pathname === '/_shell') return true; return false }""", timeout=30000)
    precached = await page.evaluate("""async () => {
      const names = await caches.keys(); const pre = names.find(n => n.includes('precache'));
      return (await (await caches.open(pre)).keys()).map(r => new URL(r.url).pathname) }""")
    assert any('kitten-idle' in u for u in precached) and any('fredoka-latin-600' in u for u in precached), precached
    assert any(u.endswith('.css') for u in precached)

    # Disconnect and relaunch.
    await ctx.set_offline(True)
    await page.reload(wait_until='domcontentloaded')
    await page.get_by_role('status').filter(has_text='Offline').wait_for()
    fonts = await page.evaluate("document.fonts.ready.then(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family))")
    assert any('Fredoka' in f for f in fonts), fonts
    await page.screenshot(path=str(OUT / f'{tag}_home_offline.png'))

    # Main level offline: X, cat, undo, restart, hints, stars, unlock.
    await page.goto(f'{BASE}/play/1', wait_until='domcontentloaded')
    cells = page.get_by_role('gridcell')
    await cells.first.wait_for()
    await (cells.nth(0).tap() if touch else cells.nth(0).click())
    await page.wait_for_timeout(450)
    # Offline refresh keeps the unfinished board and its undo history.
    await page.reload(wait_until='domcontentloaded')
    await cells.first.wait_for()
    assert 'marked' in (await cells.nth(0).get_attribute('aria-label') or '')
    await page.get_by_role('button', name='Undo', exact=True).click()
    await (cells.nth(0).tap() if touch else cells.nth(0).click())
    await page.wait_for_timeout(450)
    await page.get_by_role('button', name='Restart', exact=True).click()
    await page.get_by_role('button', name='Restart', exact=True).last.click()
    win = await solve_with_hints(page, 'Level complete')
    prog = await page.evaluate("JSON.parse(localStorage.getItem('purrzle.progress'))")
    assert prog['unlocked'] == 2 and prog['stars']['1'] >= 1, prog
    await page.screenshot(path=str(OUT / f'{tag}_main_win_offline.png'))

    # Never-visited-online page: open level 2 directly while offline.
    await page.goto(f'{BASE}/play/2', wait_until='domcontentloaded')
    await page.get_by_role('gridcell').first.wait_for()

    # Daily offline.
    await page.goto(f'{BASE}/daily', wait_until='domcontentloaded')
    await page.get_by_role('button', name="Play Today's Puzzle").click()
    await solve_with_hints(page, 'Daily complete')
    daily = await page.evaluate("JSON.parse(localStorage.getItem('purrzle.daily.v1'))")
    assert daily['currentStreak'] == 1 and len(daily['completed']) == 1, daily
    await page.goto(f'{BASE}/daily', wait_until='domcontentloaded')
    await page.get_by_text('1 day streak', exact=False).first.wait_for()

    # Settings offline.
    await page.goto(f'{BASE}/settings', wait_until='domcontentloaded')
    await page.get_by_role('switch', name='Reduce motion', exact=False).click()
    await page.get_by_role('switch', name='Sound effects', exact=False).click()
    s = await page.evaluate("JSON.parse(localStorage.getItem('purrzle.settings'))")
    assert s['reducedMotion'] is True and s['sound'] is False, s

    # Close and reopen the app offline: new page, same context storage.
    await page.close()
    page = await ctx.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    await page.goto(f'{BASE}/levels', wait_until='domcontentloaded')
    await page.get_by_role('link', name='Level 2, play now', exact=True).wait_for()
    assert await page.evaluate("document.documentElement.classList.contains('reduce-motion')")
    assert not await page.evaluate('document.documentElement.scrollWidth > innerWidth')

    # Offline at local midnight: the next date's puzzle is still available.
    tomorrow_page = await ctx.new_page()
    from datetime import datetime, timedelta, timezone
    ist = timezone(timedelta(hours=5, minutes=30))
    nxt = (datetime.now(ist) + timedelta(days=1)).replace(hour=0, minute=5, second=0, microsecond=0)
    await tomorrow_page.clock.install(time=nxt)
    await tomorrow_page.goto(f'{BASE}/daily', wait_until='domcontentloaded')
    await tomorrow_page.get_by_role('button', name="Play Today's Puzzle").click()
    await tomorrow_page.get_by_role('gridcell').first.wait_for()
    assert nxt.strftime('%Y-%m-%d') in tomorrow_page.url, tomorrow_page.url
    await tomorrow_page.close()

    # Storage failure is recoverable, not a crash.
    await page.goto(f'{BASE}/play/2', wait_until='domcontentloaded')
    await page.evaluate("() => { Storage.prototype.setItem = function () { throw new DOMException('full', 'QuotaExceededError') } }")
    c = page.get_by_role('gridcell')
    await c.first.wait_for()
    await page.get_by_role('button', name='Hint', exact=False).click()
    await page.get_by_role('alert').wait_for()
    await page.screenshot(path=str(OUT / f'{tag}_storage_error.png'))

    # Missing cached files while online: the worker falls through to the network.
    await ctx.set_offline(False)
    await page.evaluate("caches.keys().then(ks => Promise.all(ks.filter(k => k.includes('precache')).map(k => caches.delete(k))))")
    await page.goto(f'{BASE}/play/2', wait_until='networkidle')
    await page.locator('[role=gridcell]').first.wait_for()
    assert not errors, errors
    await browser.close()
    print('offline ok', width, height)


async def failed_install(p):
    """A worker that cannot install leaves the online game fully playable."""
    browser = await p.chromium.launch(headless=True)
    # Registration is refused by the browser, the same path as a failed install.
    ctx = await browser.new_context(viewport={'width': 390, 'height': 844}, service_workers='block')
    page = await ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    await page.goto(f'{BASE}/play/1', wait_until='networkidle')
    await page.locator('[role=gridcell]').first.wait_for()
    await page.wait_for_timeout(1500)
    assert not errors, errors
    await browser.close()
    print('failed install ok')


async def main():
    async with async_playwright() as p:
        await run(p, 320, 640, True)
        await run(p, 1280, 1800, False)
        await failed_install(p)

asyncio.run(main())
