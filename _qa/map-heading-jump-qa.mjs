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
  await page.addInitScript(
    (locale) => localStorage.setItem('game_locale', locale),
    viewport.width < 350 ? 'zh' : 'en',
  );
  await page.goto('http://127.0.0.1:4173/#manual', { waitUntil: 'domcontentloaded' });
  await page.locator('#sleeping[data-preview-state="frozen"]').waitFor({ state: 'visible', timeout: 120_000 });
  await page.addStyleTag({ content: '#alteru-guest-banner,#alteru-guest-login{display:none!important}' });
  await page.locator('#start-button').click();
  await page.locator('#sleeping').waitFor({ state: 'hidden', timeout: 120_000 });

  const summary = await page.locator('#map-summary-button').boundingBox();
  if (!summary || summary.width < 44 || summary.height < 44) throw new Error(`Summary map target too small: ${JSON.stringify(summary)}`);
  await page.locator('#map-summary-button').tap();
  await page.locator('#map-panel').waitFor({ state: 'visible' });
  const expanded = await page.locator('#map-summary-button').getAttribute('aria-expanded');
  if (expanded !== 'true') throw new Error(`Summary map trigger did not expand: ${expanded}`);
  await page.locator('#map-close').tap();

  const expected = [
    { yaw: 0, angle: 0, name: 'north' },
    { yaw: Math.PI / 2, angle: -90, name: 'west' },
    { yaw: -Math.PI / 2, angle: 90, name: 'east' },
    { yaw: Math.PI, angle: 180, name: 'south' },
  ];
  const headings = [];
  for (const item of expected) {
    const state = await page.evaluate((yaw) => {
      window.__game.walker.yaw = yaw;
      window.__expeditionQa.openMap();
      const transform = document.querySelector('#map-player').getAttribute('transform');
      const paper = getComputedStyle(document.querySelector('.jt-map__sheet'), '::before').backgroundImage;
      const paperEdge = getComputedStyle(document.querySelector('.jt-map__sheet')).clipPath;
      const decorativeLines = document.querySelectorAll('.jt-map__page-frame,.jt-map__corner-mark,.jt-map__grid,.jt-map__ridge').length;
      return { transform, paper, paperEdge, decorativeLines };
    }, item.yaw);
    const angle = Number(state.transform.match(/rotate\(([-\d.]+)/)?.[1]);
    const error = Math.min(Math.abs(angle - item.angle), Math.abs(angle + item.angle));
    if (!Number.isFinite(angle) || error > 0.2) {
      throw new Error(`Map heading ${item.name} is wrong: ${JSON.stringify({ viewport, item, state, angle })}`);
    }
    const lightFields = (state.paper.match(/linear-gradient/g) || []).length;
    if (lightFields !== 2) throw new Error(`Paper is missing the two-axis light field: ${state.paper}`);
    if ((state.paperEdge.match(/,/g) || []).length < 20) throw new Error(`Paper fold-edge wear is missing: ${state.paperEdge}`);
    if (state.decorativeLines !== 0) throw new Error(`Map still contains ${state.decorativeLines} decorative line groups`);
    headings.push({ ...item, actual: angle });
    if (item.name === 'north' || (viewport.width === 390 && item.name === 'east')) {
      await page.waitForTimeout(280);
      await page.screenshot({
        path: shot(`platform-layout-map-heading-${item.name}-${viewport.width}x${viewport.height}.png`),
        fullPage: true,
      });
    }
    await page.evaluate(() => window.__expeditionQa.closeMap());
  }

  const jump = await page.evaluate(() => {
    const game = window.__game;
    const walker = window.__game.walker;
    const dt = 1 / 120;
    let airborneAt = -1;
    let landedAt = -1;
    let maxHeight = 0;
    game.setPaused(true);
    walker.jump();
    for (let frame = 0; frame < 600; frame += 1) {
      game.step(dt);
      maxHeight = Math.max(maxHeight, walker.jumpHeight);
      if (airborneAt < 0 && walker.jumpState === 'airborne') airborneAt = frame * dt;
      if (airborneAt >= 0 && walker.jumpState === 'land') {
        landedAt = frame * dt;
        break;
      }
    }
    while (walker.jumpState !== 'grounded') game.step(dt);
    game.setPaused(false);
    return { maxHeight, airborneSeconds: landedAt - airborneAt };
  });
  if (jump.maxHeight < 0.67 || jump.maxHeight > 0.75 || jump.airborneSeconds < 0.68 || jump.airborneSeconds > 0.85) {
    throw new Error(`Live jump tuning out of range: ${JSON.stringify({ viewport, jump })}`);
  }

  if (viewport.width === 390) {
    await page.evaluate(() => {
      const game = window.__game;
      const walker = game.walker;
      game.setPaused(true);
      walker.jump();
      for (let frame = 0; frame < 300; frame += 1) {
        game.step(1 / 120);
        if (walker.jumpState === 'airborne' && walker.verticalVelocity <= 0) break;
      }
      game.renderOnce();
    });
    await page.screenshot({ path: shot('platform-layout-jump-apex-390x844.png'), fullPage: true });
    await page.evaluate(() => {
      const game = window.__game;
      while (game.walker.jumpState !== 'grounded') game.step(1 / 120);
      game.setPaused(false);
    });
  }

  console.log(JSON.stringify({ viewport, summary, headings, jump }));
  await context.close();
}

await browser.close();
