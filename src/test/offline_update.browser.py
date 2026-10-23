"""Update flow on one persistent browser profile.

Phase `seed`: install the current build online and save progress.
Then deploy a changed build and run phase `update`: the new version waits,
the notice appears, Refresh switches versions, progress survives, offline still works.
"""
import asyncio
import sys
from playwright.async_api import async_playwright

BASE = 'http://127.0.0.1:4173'
PROFILE = '/tmp/browser/offline-profile'


async def main(phase):
    async with async_playwright() as p:
        ctx = await p.chromium.launch_persistent_context(PROFILE, headless=True, viewport={'width': 390, 'height': 844}, has_touch=True)
        page = ctx.pages[0] if ctx.pages else await ctx.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        await page.goto(BASE, wait_until='networkidle')
        if phase == 'seed':
            await page.evaluate("""() => {
              localStorage.setItem('purrzle.tutorial.v1','done');
              localStorage.setItem('purrzle.progress', JSON.stringify({unlocked:4,stars:{1:3,2:2,3:1}}));
            }""")
            await page.wait_for_function("navigator.serviceWorker.controller !== null", timeout=20000)
            print('seeded', await page.evaluate("navigator.serviceWorker.controller.scriptURL"))
        else:
            notice = page.get_by_role('status').filter(has_text='New version ready')
            await notice.wait_for(timeout=30000)
            # Old version keeps running untouched until the player chooses to refresh.
            await page.goto(f'{BASE}/play/4', wait_until='domcontentloaded')
            await page.locator('[role=gridcell]').first.wait_for()
            await page.get_by_role('button', name='Refresh').click()
            await page.wait_for_load_state('load')
            await page.wait_for_timeout(1500)
            assert await page.get_by_role('status').filter(has_text='New version ready').count() == 0
            prog = await page.evaluate("JSON.parse(localStorage.getItem('purrzle.progress'))")
            assert prog == {'unlocked': 4, 'stars': {'1': 3, '2': 2, '3': 1}}, prog
            await ctx.set_offline(True)
            await page.goto(f'{BASE}/levels', wait_until='domcontentloaded')
            await page.get_by_role('link', name='Level 4, play now', exact=True).wait_for()
            from datetime import datetime, timedelta, timezone
            day = datetime.now(timezone.utc).astimezone().date().isoformat()
            await page.goto(f'{BASE}/daily-play/{day}', wait_until='domcontentloaded')
            await page.get_by_role('heading', name='Daily Purrzle').wait_for()
            print('update ok')
        assert not errors, errors
        await ctx.close()

asyncio.run(main(sys.argv[1]))
