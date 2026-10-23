import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright
OUT=Path('/tmp/browser/purrzle')
OUT.mkdir(parents=True,exist_ok=True)
async def run(p, name, viewport, touch=False):
 browser=await p.chromium.launch(headless=True)
 context=await browser.new_context(viewport=viewport, has_touch=touch)
 page=await context.new_page()
 errors=[]
 page.on('pageerror', lambda err: errors.append(str(err)))
 await page.goto('http://localhost:8080/play/1', wait_until='networkidle')
 tutorial=page.get_by_role('dialog')
 await tutorial.get_by_role('button',name='Next',exact=True).click()
 await tutorial.get_by_role('button',name='Next',exact=True).click()
 await tutorial.get_by_role('button',name='Next',exact=True).click()
 await tutorial.get_by_role('button',name="Let's play",exact=True).click()
 await page.wait_for_timeout(650)
 cells=page.get_by_role('gridcell')
 assert await cells.count()==25
 assert await page.get_by_role('radiogroup').count()==0
 async def geometry():
  return await page.get_by_role('grid').evaluate('(e)=>[e,...e.children].map(x=>{const r=x.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})')
 baseline=await geometry()
 assert abs(baseline[0][2]-baseline[0][3])<0.05
 assert all(abs(b[2]-b[3])<0.05 for b in baseline[1:])
 async def stable():
  actual=await geometry()
  assert all(abs(a-b)<0.05 for left,right in zip(baseline,actual) for a,b in zip(left,right)), (baseline,actual)
 async def tap(index):
  if touch: await cells.nth(index).tap()
  else: await cells.nth(index).click()
 async def double(index):
  if touch:
   await cells.nth(index).tap(); await page.wait_for_timeout(65); await cells.nth(index).tap()
  else: await cells.nth(index).dblclick(delay=65)
 # Single tap delays X; two cells act independently.
 await tap(1)
 assert 'empty' in await cells.nth(1).get_attribute('aria-label')
 await tap(3)
 await page.wait_for_timeout(300)
 assert 'marked' in await cells.nth(1).get_attribute('aria-label')
 assert 'marked' in await cells.nth(3).get_attribute('aria-label')
 await stable()
 await page.get_by_role('button',name='Undo',exact=True).click()
 await page.get_by_role('button',name='Undo',exact=True).click()
 # Record double-tap mutations: must never contain intermediate marked state.
 await cells.nth(0).evaluate("e=>{window.cellLabels=[];window.observer=new MutationObserver(ms=>ms.forEach(m=>window.cellLabels.push({old:m.oldValue,new:e.getAttribute('aria-label')})));window.observer.observe(e,{attributes:true,attributeOldValue:true,attributeFilter:['aria-label']})}")
 await double(0)
 await page.wait_for_timeout(40)
 assert 'cat, conflict' in await cells.nth(0).get_attribute('aria-label')
 assert await page.get_by_role('status').inner_text()=='Not quite! Try another spot.'
 assert not any('marked' in (x['old'] or '') or 'marked' in (x['new'] or '') for x in await page.evaluate('window.cellLabels'))
 await stable()
 await page.screenshot(path=str(OUT/f'{name}_wrong.png'))
 await page.get_by_role('button',name='Undo',exact=True).click()
 assert 'empty' in await cells.nth(0).get_attribute('aria-label')
 # Keyboard alternative and restart clearing counters.
 await cells.nth(2).focus(); await page.keyboard.press('Enter')
 assert 'cat' in await cells.nth(2).get_attribute('aria-label')
 await stable()
 await page.get_by_role('button',name='Restart',exact=True).click()
 await page.get_by_role('dialog').get_by_role('button',name='Restart',exact=True).click()
 assert all(['empty' in await cells.nth(i).get_attribute('aria-label') for i in range(25)])
 await stable()
 # Fixed Level 1 solution [2,0,4,1,3], no hints or mistakes after reset.
 for index in [2,5,14,16,23]:
  await double(index)
  if index !=23: await stable()
 win=page.get_by_role('dialog',name='Level complete')
 await win.wait_for()
 assert await win.get_by_label('3 of 3 stars').count()==1
 assert '0 hints · 0 clashes' in await win.inner_text()
 await page.wait_for_timeout(1200)
 await page.screenshot(path=str(OUT/f'{name}_win.png'))
 await win.get_by_role('button',name='Next level',exact=True).click()
 await page.wait_for_url('**/play/2')
 await page.get_by_role('gridcell').first.wait_for()
 await page.reload(wait_until='networkidle')
 assert await page.get_by_role('gridcell').count()==25
 saved=await page.evaluate("JSON.parse(localStorage.getItem('purrzle.progress'))")
 assert saved['unlocked']==2 and saved['stars']['1']==3
 assert not errors, errors
 print(name, 'PASS: independent taps, no intermediate X, wrong feedback, stable square cells, keyboard, undo, restart, three-star win, Level 2 saved', json.dumps(saved))
 await browser.close()
async def main():
 async with async_playwright() as p:
  await run(p,'desktop',{'width':1280,'height':1800})
  await run(p,'phone',{'width':390,'height':844},True)
asyncio.run(main())
