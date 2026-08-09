import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const output = new URL('./ui/', import.meta.url);
await mkdir(output, { recursive: true });
const shot = (name) => fileURLToPath(new URL(name, output));
const browser = await chromium.launch({ headless: true });
const requestedWidth = Number(process.argv[2] || 0);

for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }]
  .filter((item) => !requestedWidth || item.width === requestedWidth)) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await page.addInitScript(
    (locale) => localStorage.setItem('game_locale', locale),
    viewport.width < 350 ? 'zh' : 'en',
  );
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.locator('#sleeping[data-preview-state="frozen"]').waitFor({ state: 'visible', timeout: 120_000 });
  await page.addStyleTag({ content: '#alteru-guest-banner,#alteru-guest-login{display:none!important}' });
  await page.locator('#start-button').click();
  await page.locator('#sleeping').waitFor({ state: 'hidden', timeout: 120_000 });

  const touch = (type, points = []) => cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: points.map((point, index) => ({
      x: point.x, y: point.y, id: point.id ?? index + 1,
      radiusX: 7, radiusY: 7, force: 1,
    })),
  });
  const yaw = () => page.evaluate(() => window.__game.walker.yaw);
  const drag = async (start, end, id) => {
    const before = await yaw();
    await touch('touchStart', [{ ...start, id }]);
    await touch('touchMove', [{ ...end, id }]);
    await touch('touchEnd');
    await page.waitForTimeout(80);
    return Math.abs((await yaw()) - before);
  };

  const zone = await page.locator('#look-zone').boundingBox();
  if (!zone || Math.abs(zone.x) > 0.5 || Math.abs(zone.width - viewport.width) > 1
      || Math.abs(zone.height / viewport.height - 0.68) > 0.015) {
    throw new Error(`Look zone does not cover the upper full-width 68%: ${JSON.stringify({ viewport, zone })}`);
  }

  await page.screenshot({
    path: shot(`platform-layout-look-zone-hint-${viewport.width}x${viewport.height}.png`),
    fullPage: true,
  });

  const y = viewport.height * 0.38;
  const deltas = [];
  deltas.push(await drag({ x: viewport.width * 0.08, y }, { x: viewport.width * 0.23, y: y - 8 }, 11));
  deltas.push(await drag({ x: viewport.width * 0.42, y }, { x: viewport.width * 0.57, y: y - 8 }, 12));
  deltas.push(await drag({ x: viewport.width * 0.72, y }, { x: viewport.width * 0.87, y: y - 8 }, 13));
  if (deltas.some((delta) => delta < 0.1)) {
    throw new Error(`Left/centre/right upper drags must all rotate the camera: ${JSON.stringify({ viewport, deltas })}`);
  }

  const lowerDelta = await drag(
    { x: viewport.width * 0.46, y: viewport.height * 0.82 },
    { x: viewport.width * 0.62, y: viewport.height * 0.80 },
    14,
  );
  if (lowerDelta > 0.01) throw new Error(`Lower control-safe area rotated the camera: ${lowerDelta}`);

  const beforeMap = await yaw();
  await page.locator('#map-button').tap();
  await page.locator('#map-panel').waitFor({ state: 'visible' });
  const afterMap = await yaw();
  if (Math.abs(afterMap - beforeMap) > 0.01) throw new Error('Map button leaked into look input');
  await page.locator('#map-close').tap();
  await page.locator('#map-panel').waitFor({ state: 'hidden' });

  const stick = await page.locator('#move-control').boundingBox();
  if (!stick) throw new Error('Move control missing');
  const stickStart = { x: stick.x + stick.width / 2, y: stick.y + stick.height / 2, id: 21 };
  const stickMove = { ...stickStart, y: stickStart.y - Math.min(48, stick.height * 0.46) };
  const lookStart = { x: viewport.width * 0.38, y: viewport.height * 0.42, id: 22 };
  const lookEnd = { x: viewport.width * 0.62, y: viewport.height * 0.39, id: 22 };
  const beforeDual = await yaw();
  await touch('touchStart', [stickStart, lookStart]);
  await touch('touchMove', [stickMove, lookEnd]);
  await page.waitForTimeout(100);
  const dual = await page.evaluate(() => ({ yaw: window.__game.walker.yaw, z: window.__game.walker.touch.z }));
  await touch('touchEnd');
  if (Math.abs(dual.yaw - beforeDual) < 0.15 || dual.z > -0.25) {
    throw new Error(`Joystick and look did not remain independent: ${JSON.stringify({ viewport, beforeDual, dual })}`);
  }

  console.log(JSON.stringify({ viewport, zone, deltas, lowerDelta, mapLeak: afterMap - beforeMap, dual }));
  await context.close();
}

await browser.close();
