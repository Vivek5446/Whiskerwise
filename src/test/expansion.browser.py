"""Real saved-progress flows plus narrow touch trail and new puzzles."""
import asyncio
import json
import re
from pathlib import Path
from playwright.async_api import async_playwright

OUT = Path('/tmp/browser/expansion')
OUT.mkdir(parents=True, exist_ok=True)
LEVEL_SOURCE = (Path(__file__).parents[1] / 'game' / 'levels.ts').read_text()
ANSWERS = [dict(size=int(size), solution=json.loads(answer)) for size, answer in
           re.findall(r'\{ size: (\d+), regions: \[.*?\], solution: (\[.*?\]) \}', LEVEL_SOURCE)]


async def run(playwright, width, height, touch):
    browser = await playwright.chromium.launch(headless=True)
    context = await browser.new_context(viewport={'width': width, 'height': height}, has_touch=touch)
    page = await context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    await page.goto('http://localhost:8080', wait_until='networkidle')
    await page.evaluate("""() => {
      localStorage.setItem('purrzle.tutorial.v1', 'done');
      localStorage.setItem('purrzle.settings', JSON.stringify({sound:false,reducedMotion:true}));
      localStorage.setItem('purrzle.progress', JSON.stringify({unlocked:8,stars:{1:3,2:3,3:3,4:3,5:3,6:3,7:2,8:1}}));
    }""")
    await page.goto('http://localhost:8080/levels', wait_until='networkidle')
    assert await page.locator('[data-level]').count() == 20
    assert await page.get_by_role('link', name='Level 9, play now', exact=True).count() == 1
    assert await page.get_by_label('Level 10, locked', exact=True).count() == 1
    assert await page.locator('[data-level="10"] a').count() == 0
    assert await page.get_by_label('Level 8, 1 stars', exact=True).count() == 1
    await page.get_by_role('button', name='Next up · Level 9', exact=True).click()
    await page.screenshot(path=str(OUT / f'{width}_current.png'))
    for level in range(1, 21):
        node = page.locator(f'[data-level="{level}"]')
        await node.scroll_into_view_if_needed()
        geometry = await node.evaluate("""e => {const r=e.getBoundingClientRect();return {x:r.x,right:r.right,bottom:r.bottom,top:r.top,w:innerWidth,h:innerHeight}}""")
        assert geometry['x'] >= -1 and geometry['right'] <= geometry['w'] + 1, (level, geometry)
        assert geometry['top'] >= -1 and geometry['bottom'] <= geometry['h'] + 1, (level, geometry)
    assert not await page.evaluate('document.documentElement.scrollWidth > innerWidth')
    await page.screenshot(path=str(OUT / f'{width}_final_trail.png'))
    # Ordinary UI cannot start a locked puzzle; direct navigation also stays locked.
    await page.get_by_label('Level 20, locked', exact=True).click()
    assert page.url.endswith('/levels')
    await page.goto('http://localhost:8080/play/10', wait_until='networkidle')
    assert await page.get_by_role('heading', name='Level 10 is locked').count() == 1
    assert await page.get_by_role('gridcell').count() == 0
    await page.get_by_role('link', name='See the trail').click()
    await page.get_by_role('button', name='Next up · Level 9', exact=True).click()
    await page.get_by_role('link', name='Level 9, play now', exact=True).click()
    await page.wait_for_url('**/play/9')
    cells = page.get_by_role('gridcell')
    await cells.first.wait_for()
    # Use hints to earn one star, then replay with exact verified answer for three.
    for _ in range(int((await cells.count()) ** .5)):
        await page.get_by_role('button', name='Hint', exact=False).click()
    win = page.get_by_role('dialog', name='Level complete')
    await win.wait_for()
    assert await win.get_by_label('1 of 3 stars', exact=True).count() == 1
    saved = await page.evaluate("JSON.parse(localStorage.getItem('purrzle.progress'))")
    assert saved == {'unlocked': 10, 'stars': {'1': 3, '2': 3, '3': 3, '4': 3, '5': 3, '6': 3, '7': 2, '8': 1, '9': 1}}, saved
    await win.get_by_role('button', name='Try for 3★', exact=True).click()
    answers = ANSWERS
    answer = answers[8]
    for row, col in enumerate(answer['solution']):
        cell = cells.nth(row * answer['size'] + col)
        if touch:
            await cell.tap()
            await page.wait_for_timeout(60)
            await cell.tap()
        else:
            await cell.dblclick(delay=60)
    await win.wait_for()
    assert await win.get_by_label('3 of 3 stars', exact=True).count() == 1
    await page.screenshot(path=str(OUT / f'{width}_new_win.png'))
    await win.get_by_role('button', name='Replay', exact=True).click()
    for _ in answer['solution']:
        await page.get_by_role('button', name='Hint', exact=False).click()
    await win.wait_for()
    assert await win.get_by_label('1 of 3 stars', exact=True).count() == 1
    assert (await page.evaluate("JSON.parse(localStorage.getItem('purrzle.progress'))"))['stars']['9'] == 3
    await win.get_by_role('button', name='Next level', exact=True).click()
    await page.wait_for_url('**/play/10')
    await page.reload(wait_until='networkidle')
    assert await page.get_by_role('gridcell').count() == answers[9]['size'] ** 2
    saved = await page.evaluate("JSON.parse(localStorage.getItem('purrzle.progress'))")
    assert saved['unlocked'] == 10 and saved['stars']['9'] == 3 and saved['stars']['1'] == 3
    # Every added board renders; final-level completion stops at 20.
    await page.evaluate("""() => {
      const p=JSON.parse(localStorage.getItem('purrzle.progress'));
      p.unlocked=20;localStorage.setItem('purrzle.progress',JSON.stringify(p));
    }""")
    for level in range(10, 21):
        await page.goto(f'http://localhost:8080/play/{level}', wait_until='networkidle')
        assert await cells.count() == answers[level-1]['size'] ** 2
        assert not await page.evaluate('document.documentElement.scrollWidth > innerWidth')
    final = answers[19]
    for row, col in enumerate(final['solution']):
        await cells.nth(row * final['size'] + col).focus()
        await page.keyboard.press('Enter')
    await win.wait_for()
    assert await win.get_by_role('button', name='Next level', exact=True).count() == 0
    assert 'You solved every level!' in await win.inner_text()
    assert (await page.evaluate("JSON.parse(localStorage.getItem('purrzle.progress'))"))['unlocked'] == 20
    await page.screenshot(path=str(OUT / f'{width}_final_win.png'))
    await page.goto('http://localhost:8080', wait_until='networkidle')
    assert not await page.evaluate('document.documentElement.scrollWidth > innerWidth')
    assert not errors, errors
    print(f'{width}x{height} PASS: 20-node trail, all added boards, locked UI, migrated save, win, better/weaker replay, refresh, final completion; no runtime errors')
    await browser.close()


async def main():
    async with async_playwright() as playwright:
        await run(playwright, 320, 640, True)
        await run(playwright, 1280, 1800, False)


asyncio.run(main())