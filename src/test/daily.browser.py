"""Daily touch/mouse play, date rollover, persistence, replay and isolated rewards."""
import asyncio
import json
import re
from datetime import datetime
from pathlib import Path
from playwright.async_api import async_playwright, expect

OUT = Path('/tmp/browser/daily')
OUT.mkdir(parents=True, exist_ok=True)
SOURCE = (Path(__file__).parents[1] / 'game' / 'daily-puzzles.ts').read_text()
CATALOG = [json.loads(value) for value in re.findall(r'\{"size".*?\}', SOURCE)]


async def run(p, width, height, touch):
    browser = await p.chromium.launch(headless=True)
    context = await browser.new_context(viewport={'width': width, 'height': height}, has_touch=touch, timezone_id='Asia/Kolkata')
    page = await context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    # 00:05 local time on January 31 is still January 30 in UTC.
    await page.clock.install(time=datetime.fromisoformat('2026-01-30T18:35:00+00:00'))
    await page.goto('http://localhost:8080', wait_until='networkidle')
    await page.evaluate("""() => {
      localStorage.setItem('purrzle.tutorial.v1','done');
      localStorage.setItem('purrzle.progress',JSON.stringify({unlocked:2,stars:{1:3}}));
      localStorage.setItem('purrzle.settings',JSON.stringify({sound:false,reducedMotion:true}));
    }""")
    await page.reload(wait_until='networkidle')
    today = await page.evaluate("(() => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })()")
    assert today == '2026-01-31', today
    main_saved = await page.evaluate("localStorage.getItem('purrzle.progress')")
    section = page.get_by_role('region', name='Daily challenge')
    assert 'Not started' in await section.inner_text()
    assert '0 day streak' in await section.inner_text()
    assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth')
    await section.scroll_into_view_if_needed()
    await page.screenshot(path=str(OUT / f'{width}_home.png'))
    await page.get_by_role('button', name="Play Today's Puzzle", exact=True).click()
    await page.wait_for_url('**/daily-play/2026-01-31')
    puzzle = CATALOG[0]
    cells = page.get_by_role('gridcell')
    await cells.first.wait_for()
    assert await cells.count() == puzzle['size'] ** 2
    async def double(index):
        if touch:
            await cells.nth(index).tap(); await page.wait_for_timeout(65); await cells.nth(index).tap()
        else:
            await cells.nth(index).dblclick(delay=65)
    # Notes, mistakes, hints and atomic history survive reload and navigation.
    wrong = 1 if puzzle['solution'][0] == 0 else 0
    mark = 2 if wrong != 2 else 3
    await cells.nth(mark).click()
    await page.wait_for_timeout(300)
    assert 'marked' in await cells.nth(mark).get_attribute('aria-label')
    await double(wrong)
    assert 'conflict' in await cells.nth(wrong).get_attribute('aria-label')
    await page.get_by_role('button', name='Hint', exact=True).click()
    saved = await page.evaluate("JSON.parse(localStorage.getItem('purrzle.daily.v1'))")
    assert saved['completed'] == {} and saved['currentStreak'] == 0
    assert saved['inProgress']['puzzleId'] == 1001
    assert saved['inProgress']['state']['mistakes'] == 1 and saved['inProgress']['state']['hintsUsed'] == 1
    before = [await cells.nth(i).get_attribute('aria-label') for i in range(await cells.count())]
    await page.reload(wait_until='networkidle')
    assert before == [await cells.nth(i).get_attribute('aria-label') for i in range(await cells.count())]
    await page.get_by_role('button', name='Undo', exact=True).click()
    assert 'conflict' in await cells.nth(wrong).get_attribute('aria-label')
    await page.get_by_role('button', name='Undo', exact=True).click()
    assert 'empty' in await cells.nth(wrong).get_attribute('aria-label')
    state = await page.evaluate("JSON.parse(localStorage.getItem('purrzle.daily.v1')).inProgress.state")
    assert state['mistakes'] == 0 and state['hintsUsed'] == 0
    await page.get_by_role('link', name='Back to daily calendar').click()
    await expect(page.get_by_role('region', name='Daily challenge')).to_be_visible()
    assert 'In progress' in await page.get_by_role('region', name='Daily challenge').inner_text()
    await page.get_by_role('button', name="Resume Today's Puzzle", exact=True).click()
    assert 'marked' in await cells.nth(mark).get_attribute('aria-label')
    # First win with hints earns one star and one completed day.
    for _ in puzzle['solution']:
        await page.get_by_role('button', name='Hint', exact=False).click()
    win = page.get_by_role('dialog', name='Daily complete')
    await win.wait_for()
    assert await win.get_by_label('1 of 3 stars', exact=True).count() == 1
    assert '1 day streak · Best 1' in await win.inner_text()
    assert await win.get_by_role('button', name='Next level', exact=True).count() == 0
    assert await page.evaluate("localStorage.getItem('purrzle.progress')") == main_saved
    await page.screenshot(path=str(OUT / f'{width}_win.png'))
    await win.get_by_role('button', name='Calendar', exact=True).click()
    assert 'Completed · 1★' in await page.get_by_role('region', name='Daily challenge').inner_text()
    await page.reload(wait_until='networkidle')
    assert 'Completed · 1★' in await page.get_by_role('region', name='Daily challenge').inner_text()
    await page.get_by_role('button', name="Replay Today's Puzzle", exact=True).click()
    for r, c in enumerate(puzzle['solution']):
        await double(r * puzzle['size'] + c)
    await win.wait_for()
    assert await win.get_by_label('3 of 3 stars', exact=True).count() == 1
    saved = await page.evaluate("JSON.parse(localStorage.getItem('purrzle.daily.v1'))")
    assert saved['completed'] == {today: {'puzzleId': 1001, 'stars': 3}}
    assert saved['currentStreak'] == 1 and saved['bestStreak'] == 1
    await win.get_by_role('button', name='Replay', exact=True).click()
    for _ in puzzle['solution']:
        await page.get_by_role('button', name='Hint', exact=False).click()
    await win.wait_for()
    assert await page.evaluate("JSON.parse(localStorage.getItem('purrzle.daily.v1')).completed['2026-01-31'].stars") == 3
    # Future URL is unavailable and cannot touch history or main unlocks.
    await page.goto('http://localhost:8080/daily-play/2026-02-01', wait_until='networkidle')
    assert await page.get_by_role('heading', name='Challenge unavailable').count() == 1
    assert await cells.count() == 0
    await page.get_by_role('link', name='Daily calendar', exact=True).click()
    await expect(page.get_by_label('Feb 1, 2026, unavailable', exact=True)).to_have_count(1)
    await page.screenshot(path=str(OUT / f'{width}_calendar.png'))
    # Local midnight while open moves the home entry to a new puzzle.
    await page.clock.set_system_time(datetime.fromisoformat('2026-01-31T18:29:59+00:00'))
    await page.goto('http://localhost:8080/', wait_until='networkidle')
    await page.clock.run_for(1200)
    assert 'Feb 1, 2026' in await page.get_by_role('region', name='Daily challenge').inner_text()
    assert 'Not started' in await page.get_by_role('region', name='Daily challenge').inner_text()
    await page.get_by_role('button', name="Play Today's Puzzle", exact=True).click()
    await page.wait_for_url('**/daily-play/2026-02-01')
    await cells.first.wait_for()
    next_puzzle = CATALOG[1]
    assert await cells.count() == next_puzzle['size'] ** 2
    for r, c in enumerate(next_puzzle['solution']):
        await cells.nth(r * next_puzzle['size'] + c).focus(); await page.keyboard.press('Enter')
    await win.wait_for()
    assert '2 days streak · Best 2' in await win.inner_text()
    assert await page.evaluate("localStorage.getItem('purrzle.progress')") == main_saved
    assert not errors, errors
    print(f'{width}x{height} PASS: local date, daily entry, taps/notes/hints, save/reload/undo, streak, replay best stars, future lock, midnight rollover, main progress unchanged')
    await browser.close()


async def main():
    async with async_playwright() as p:
        await run(p, 320, 640, True)
        await run(p, 1280, 1800, False)


asyncio.run(main())