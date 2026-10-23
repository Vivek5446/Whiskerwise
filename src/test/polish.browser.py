import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
OUT=Path('/tmp/browser/polish')
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True)
  context=await browser.new_context(viewport={'width':320,'height':640},has_touch=True)
  page=await context.new_page()
  errors=[]
  page.on('pageerror',lambda e: errors.append(str(e)))
  for route,name in [('/','home'),('/levels','trail'),('/settings','settings'),('/play/1','tutorial')]:
   await page.goto('http://localhost:8080'+route,wait_until='networkidle')
   await page.wait_for_timeout(700)
   assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth'), name
   await page.screenshot(path=str(OUT/(name+'.png')))
   if name=='home':
    assert (await page.get_by_role('button',name='Levels',exact=True).bounding_box())['y']<640
   if name=='settings':
    music=page.get_by_role('switch',name='Music Coming soon')
    assert await music.is_disabled()
  dialog=page.get_by_role('dialog')
  for _ in range(3): await dialog.get_by_role('button',name='Next',exact=True).click()
  await dialog.get_by_role('button',name="Let's play",exact=True).click()
  await page.reload(wait_until='networkidle')
  assert await page.get_by_role('dialog').count()==0
  await page.get_by_role('button',name='Help',exact=True).click()
  assert await page.get_by_role('dialog').count()==1
  await page.get_by_role('button',name='Close tutorial').click()
  await page.get_by_role('button',name='Pause',exact=True).click()
  await page.wait_for_timeout(600); await page.screenshot(path=str(OUT/'pause.png'))
  await page.get_by_role('button',name='Resume',exact=True).click()
  await page.get_by_role('button',name='Hint',exact=True).click()
  assert 'cat' in await page.get_by_role('gridcell').nth(2).get_attribute('aria-label')
  await page.screenshot(path=str(OUT/'hint.png'))
  await page.goto('http://localhost:8080/settings',wait_until='networkidle')
  await page.get_by_role('switch',name='Reduce motion Calmer animations').click()
  await page.get_by_role('switch',name='Sound effects Soft pops and chimes').click()
  # Unfinished boards now resume; start this check from a fresh board.
  await page.evaluate("localStorage.removeItem('purrzle.main-boards.v1')")
  await page.goto('http://localhost:8080/play/1',wait_until='networkidle')
  # Instrument actual Web Audio calls, not a mocked settings value.
  await page.evaluate('()=>{window.oscillators=0; const original=AudioContext.prototype.createOscillator;AudioContext.prototype.createOscillator=function(){window.oscillators++;return original.call(this)}}')
  cells=page.get_by_role('gridcell')
  await cells.nth(2).tap();await page.wait_for_timeout(50);await cells.nth(2).tap()
  await page.wait_for_timeout(100)
  assert await page.evaluate('window.oscillators')==0
  duration=await cells.nth(2).locator('.animate-pop').evaluate('e=>getComputedStyle(e).animationDuration')
  assert duration=='0.001s',duration
  await page.get_by_role('button',name='Hint',exact=True).click()
  shadow=await page.locator('.animate-hint').evaluate('e=>getComputedStyle(e).boxShadow')
  assert shadow!='none'
  await page.goto('http://localhost:8080/settings',wait_until='networkidle')
  await page.get_by_role('switch',name='Sound effects Soft pops and chimes').click()
  await page.evaluate("localStorage.removeItem('purrzle.main-boards.v1')")
  await page.goto('http://localhost:8080/play/1',wait_until='networkidle')
  await page.evaluate('()=>{window.oscillators=0; const original=AudioContext.prototype.createOscillator;AudioContext.prototype.createOscillator=function(){window.oscillators++;return original.call(this)}}')
  for i in [2,5,14,16,23]:
   await page.get_by_role('gridcell').nth(i).tap();await page.wait_for_timeout(50);await page.get_by_role('gridcell').nth(i).tap()
  win=page.get_by_role('dialog',name='Level complete')
  await win.wait_for()
  assert await page.evaluate('window.oscillators')>0
  assert await page.locator('.animate-sparkle').first.evaluate('e=>getComputedStyle(e).display')=='none'
  stars=win.get_by_label('3 of 3 stars').locator('svg')
  assert await stars.first.evaluate('e=>getComputedStyle(e).animationDelay')=='0s'
  await page.screenshot(path=str(OUT/'reduced_win.png'))
  await context.clear_cookies()
  await page.evaluate('localStorage.clear()')
  await page.emulate_media(reduced_motion='reduce')
  await page.goto('http://localhost:8080/',wait_until='networkidle')
  assert await page.locator('.animate-float').first.evaluate('e=>getComputedStyle(e).animationDuration')=='0.001s'
  assert not errors,errors
  print('PASS narrow 320px screens, tutorial once/replay, pause, hints, sound on/off, app and OS reduced motion, no overflow/runtime errors')
  await browser.close()
asyncio.run(main())
