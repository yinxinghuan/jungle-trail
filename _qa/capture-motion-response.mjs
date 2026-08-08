import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('./ui/', import.meta.url);
await mkdir(root, { recursive: true });
const shot = (name) => fileURLToPath(new URL(name, root));

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  hasTouch: true,
  isMobile: true,
});
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await page.addInitScript(() => localStorage.setItem('game_locale', 'en'));
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
await page.locator('#sleeping[data-preview-state="frozen"]').waitFor({ state: 'visible', timeout: 120_000 });
await page.addStyleTag({ content: '#alteru-guest-banner{display:none!important}' });
await page.locator('#start-button').click();
await page.locator('#sleeping').waitFor({ state: 'hidden', timeout: 120_000 });
await page.evaluate(() => {
  document.querySelector('#hint').hidden = true;
  document.querySelector('#ghost-gesture').hidden = true;
});

const optics = await page.evaluate(() => ({
  mobileLike: window.__game.mobileLike,
  tier: window.__game.tier,
  shutter: window.__game.atmos.grade.shutter,
  motionTaps: window.__game.atmos.grade.motionMat.uniforms.uTaps.value,
  frameCap: window.__game.frameCap,
  adaptiveFrameCap: window.__game._adaptiveFrameCap,
}));
if (!optics.mobileLike || optics.tier !== 'low' || optics.shutter !== 0.22
    || optics.motionTaps !== 4 || !optics.adaptiveFrameCap) {
  throw new Error(`Unexpected mobile response profile: ${JSON.stringify(optics)}`);
}

// Exercise the production touch-look handler, then capture the moving and
// settled states. The new low shutter should preserve readable path edges.
await cdp.send('Input.dispatchTouchEvent', {
  type: 'touchStart',
  touchPoints: [{ x: 280, y: 390, id: 1, radiusX: 7, radiusY: 7, force: 1 }],
});
for (let i = 1; i <= 5; i += 1) {
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: 280 + i * 12, y: 390 - i * 2, id: 1, radiusX: 7, radiusY: 7, force: 1 }],
  });
  await page.waitForTimeout(22);
}
await page.screenshot({ path: shot('platform-layout-look-motion-low-blur-390x844.png'), fullPage: true });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await page.waitForTimeout(260);
await page.screenshot({ path: shot('platform-layout-look-settled-low-blur-390x844.png'), fullPage: true });

await page.setViewportSize({ width: 320, height: 568 });
await page.waitForTimeout(220);
await cdp.send('Input.dispatchTouchEvent', {
  type: 'touchStart',
  touchPoints: [{ x: 230, y: 290, id: 2, radiusX: 7, radiusY: 7, force: 1 }],
});
for (let i = 1; i <= 4; i += 1) {
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: 230 + i * 11, y: 290 - i * 2, id: 2, radiusX: 7, radiusY: 7, force: 1 }],
  });
  await page.waitForTimeout(22);
}
await page.screenshot({ path: shot('platform-layout-look-motion-low-blur-320x568.png'), fullPage: true });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

const fallback = await page.evaluate(() => {
  const game = window.__game;
  game.frameCap = 60;
  game._badFor = 1.59;
  game._adapt(1 / 30);
  return game.frameCap;
});
if (fallback !== 30) throw new Error(`Mobile frame fallback did not engage: ${fallback}`);

console.log(JSON.stringify({ optics, fallback }));
await context.close();
await browser.close();
