"""Regression: daily URLs open the right puzzle offline even when never visited or cached.

Needs a production build served on :4173 (see offline.browser.py). Network is cut with
context.set_offline, so requests really fail; the app shell must boot the route.
"""
import asyncio
import json
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from playwright.async_api import async_playwright

BASE = 'http://127.0.0.1:4173'
OUT = Path('/tmp/browser/daily-offline')
OUT.mkdir(parents=True, exist_ok=True)
IST = timezone(timedelta(hours=5, minutes=30))
SRC = (Path(__file__).parents[1] / 'game' / 'daily-puzzles.ts').read_text()
CATALOG = [json.loads(m) for m in re.findall(r'^\s*(\{"size".*?\})\s*,?\s*$', SRC, re.M)]
EPOCH = datetime(2026, 1, 1).date()
assert len(CATALOG) == 30


def puzzle_for(day):
    return CATALOG[(day - EPOCH).days % 30]


async def at(ctx, when, errors):
    page = await ctx.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    await page.clock.install(time=when)
    return page


async def solve(page, puzzle, touch):
    cells = page.get_by_role('gridcell')
    await cells.first.wait_for()
    assert await cells.count() == puzzle['size'] ** 2
    for row, col in enumerate(puzzle['solution']):
        cell = cells.nth(row * puzzle['size'] + col)
        if touch:
            await cell.tap(); await page.wait_for_timeout(60); await cell.tap()
        else:
            await cell.dblclick(delay=60)
        await page.wait_for_timeout(120)


async def run(p, width, height, touch):
    browser = await p.chromium.launch(headless=True)
    ctx = await browser.new_context(viewport={'width': width, 'height': height}, has_touch=touch, timezone_id='Asia/Kolkata')
    errors = []
    now = datetime.now(IST).replace(hour=12, minute=0, second=0, microsecond=0)
    today = now.date()
    yesterday = today - timedelta(days=1)

    # Online install from the home screen only; no daily page is ever visited online.
    page = await at(ctx, now, errors)
    await page.goto(BASE, wait_until='networkidle')
    main = {'unlocked': 5, 'stars': {'1': 3, '2': 2, '3': 3, '4': 1}}
    daily = {'completed': {yesterday.isoformat(): {'puzzleId': puzzle_for(yesterday) and 1000 + ((yesterday - EPOCH).days % 30) + 1, 'stars': 2}},
             'lastCompleted': yesterday.isoformat(), 'currentStreak': 4, 'bestStreak': 6, 'inProgress': None}
    await page.evaluate("""([m, d]) => {
      localStorage.setItem('purrzle.tutorial.v1','done');
      localStorage.setItem('purrzle.settings', JSON.stringify({sound:false,reducedMotion:true,showConflicts:true,music:false}));
      localStorage.setItem('purrzle.progress', JSON.stringify(m));
      localStorage.setItem('purrzle.daily.v1', JSON.stringify(d));
    }""", [main, daily])
    await page.wait_for_function("navigator.serviceWorker.controller !== null", timeout=20000)
    await page.wait_for_function("""async () => { for (const n of await caches.keys())
      for (const r of await (await caches.open(n)).keys()) if (new URL(r.url).pathname === '/_shell') return true; return false }""", timeout=30000)
    pages_cached = await page.evaluate("caches.keys()")
    assert 'purrzle-pages' not in pages_cached, pages_cached
    await page.close()
    await ctx.set_offline(True)

    # 1. Today's never-cached daily URL, opened directly offline.
    page = await at(ctx, now, errors)
    await page.goto(f'{BASE}/daily-play/{today.isoformat()}', wait_until='domcontentloaded')
    await page.get_by_role('heading', name='Daily Purrzle').wait_for()
    cells = page.get_by_role('gridcell')
    await cells.first.wait_for()
    assert await cells.count() == puzzle_for(today)['size'] ** 2
    # Place one note, refresh offline, board survives.
    await (cells.nth(0).tap() if touch else cells.nth(0).click())
    await page.wait_for_timeout(500)
    await page.reload(wait_until='domcontentloaded')
    await cells.first.wait_for()
    assert 'marked' in (await cells.nth(0).get_attribute('aria-label'))
    await page.close()

    # 2. Close and reopen the app offline at its start URL.
    page = await at(ctx, now, errors)
    await page.goto(f'{BASE}/', wait_until='domcontentloaded')
    await page.get_by_text('In progress').first.wait_for()
    await page.close()

    # 3. Four days later, still offline, direct URL for that day; solve with its fixed answer.
    later = now + timedelta(days=4)
    page = await at(ctx, later, errors)
    await page.goto(f'{BASE}/daily-play/{later.date().isoformat()}', wait_until='domcontentloaded')
    await page.get_by_role('heading', name='Daily Purrzle').wait_for()
    await page.get_by_role('button', name='Undo', exact=True).wait_for()
    await solve(page, puzzle_for(later.date()), touch)
    win = page.get_by_role('dialog', name='Daily complete')
    await win.wait_for()
    await page.screenshot(path=str(OUT / f'{width}_later_win.png'))
    saved = await page.evaluate("JSON.parse(localStorage.getItem('purrzle.daily.v1'))")
    assert saved['currentStreak'] == 1 and saved['bestStreak'] == 6, saved  # skipped days restart at one
    assert saved['completed'][yesterday.isoformat()]['stars'] == 2
    assert saved['completed'][later.date().isoformat()]['stars'] == 3
    assert await page.evaluate("JSON.parse(localStorage.getItem('purrzle.progress'))") == main
    # Refresh the completed daily offline: still shows the same day's puzzle.
    await page.reload(wait_until='domcontentloaded')
    await page.get_by_role('heading', name='Daily Purrzle').wait_for()
    await page.close()

    # 4. Local midnight crossing offline, into a new month/year boundary is covered by unit tests;
    # here: 23:59 → 00:01 changes which date is playable.
    eve = (later + timedelta(days=1)).replace(hour=23, minute=59, second=30)
    page = await at(ctx, eve, errors)
    await page.goto(f'{BASE}/daily', wait_until='domcontentloaded')
    await page.get_by_role('button', name="Play Today's Puzzle").click()
    await page.wait_for_url(f'**/daily-play/{eve.date().isoformat()}')
    await page.clock.fast_forward(60_000)
    await page.goto(f'{BASE}/daily-play/{(eve.date() + timedelta(days=1)).isoformat()}', wait_until='domcontentloaded')
    await page.get_by_role('gridcell').first.wait_for()
    assert await page.get_by_role('gridcell').count() == puzzle_for(eve.date() + timedelta(days=1))['size'] ** 2
    await page.close()

    # 5. Non-today dates and unknown routes show local fallbacks, not home or a crash.
    page = await at(ctx, later, errors)
    await page.goto(f'{BASE}/daily-play/{(later.date() + timedelta(days=3)).isoformat()}', wait_until='domcontentloaded')
    await page.get_by_role('heading', name='Challenge unavailable').wait_for()
    await page.goto(f'{BASE}/daily-play/not-a-date', wait_until='domcontentloaded')
    await page.get_by_role('heading', name='Challenge unavailable').wait_for()
    await page.goto(f'{BASE}/no-such-page', wait_until='domcontentloaded')
    await page.get_by_role('heading', name='Page not found').wait_for()
    await page.goto(f'{BASE}/play/5', wait_until='domcontentloaded')
    await page.get_by_role('heading', name='Level 5').wait_for()
    await page.get_by_role('gridcell').first.wait_for()
    await page.goto(f'{BASE}/play/9', wait_until='domcontentloaded')
    await page.get_by_role('heading', name='Level 9 is locked').wait_for()
    await page.goto(f'{BASE}/levels', wait_until='domcontentloaded')
    await page.get_by_role('link', name='Level 5, play now', exact=True).wait_for()
    assert await page.evaluate("document.documentElement.classList.contains('reduce-motion')")
    assert await page.get_by_role('status').filter(has_text='Offline').count() == 1
    assert not await page.evaluate('document.documentElement.scrollWidth > innerWidth')
    await page.screenshot(path=str(OUT / f'{width}_levels_offline.png'))
    # Back online: the indicator goes away.
    await ctx.set_offline(False)
    await page.wait_for_timeout(300)
    assert await page.get_by_role('status').filter(has_text='Offline').count() == 0

    assert not errors, errors
    await browser.close()
    print('PASS', width, height, 'never-cached daily URLs offline, +4 days, refresh, reopen, midnight, fallbacks, progress kept')


async def main():
    async with async_playwright() as p:
        await run(p, 320, 640, True)
        await run(p, 1280, 1800, False)

asyncio.run(main())
