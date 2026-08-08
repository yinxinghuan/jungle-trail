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

const touch = async (type, points = []) => cdp.send('Input.dispatchTouchEvent', {
  type,
  touchPoints: points.map((p, i) => ({
    x: p.x, y: p.y, id: p.id ?? i + 1, radiusX: 7, radiusY: 7, force: 1,
  })),
});

const readState = () => page.evaluate(() => ({
  clueDistance: Number(document.querySelector('#hud').dataset.clueDistance || Infinity),
  centerDistance: Number(document.querySelector('#hud').dataset.clueCenterDistance || Infinity),
  clueState: document.querySelector('#hud').dataset.clueState,
  trailDistance: Number(document.querySelector('#hud').dataset.trailDistance || 0),
  trailT: window.__game.walker.trailT,
  sprinting: window.__game.walker.isSprinting,
  speed: window.__game.walker.speed,
  moveInput: { x: window.__game.walker.touch.x, z: window.__game.walker.touch.z },
  landmark: document.querySelector('#landmark-label').textContent,
}));

// Use the visible analogue stick and sprint control on the opening straight.
// This intentionally validates a natural input segment; clue state coverage
// lives in capture-clue.mjs and capture-navigation.mjs.
const forwardTouch = { x: 74, y: 716, id: 1 };
const sprintTouch = { x: 254, y: 792, id: 2 };
let walking = await readState();
const startedAt = Date.now();
await touch('touchStart', [sprintTouch]);
await page.waitForTimeout(120);
const sawSprint = (await readState()).sprinting;
await touch('touchEnd');
await touch('touchStart', [{ x: 74, y: 770, id: 1 }]);
await touch('touchMove', [forwardTouch]);
while (Date.now() - startedAt < 9_000) {
  await page.waitForTimeout(180);
  await touch('touchMove', [forwardTouch]);
  walking = await readState();
  if (walking.trailDistance > 3.4) {
    throw new Error(`Natural joystick play left the recoverable corridor: ${JSON.stringify(walking)}`);
  }
}
await touch('touchEnd');
if (!sawSprint || walking.trailT < 0.012) {
  throw new Error(`Natural movement segment did not advance at sprint pace: ${JSON.stringify(walking)}`);
}

const yawBefore = await page.evaluate(() => window.__game.walker.yaw);
await touch('touchStart', [{ x: 285, y: 400, id: 3 }]);
await touch('touchMove', [{ x: 325, y: 388, id: 3 }]);
await touch('touchEnd');
await page.waitForTimeout(220);
const yawAfter = await page.evaluate(() => window.__game.walker.yaw);
if (Math.abs(yawAfter - yawBefore) < 0.08) {
  throw new Error(`Natural look drag did not rotate the camera: ${yawBefore} -> ${yawAfter}`);
}

const result = await readState();
await page.screenshot({ path: shot('platform-layout-natural-input-segment-390x844.png'), fullPage: true });

console.log(JSON.stringify({ walking, sawSprint, yawBefore, yawAfter, result }));
await context.close();
await browser.close();
