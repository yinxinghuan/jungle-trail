import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('./ui/', import.meta.url);
await mkdir(root, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  hasTouch: true,
  isMobile: true,
});
const page = await context.newPage();
await page.addInitScript(() => localStorage.setItem('game_locale', 'en'));
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
await page.locator('#sleeping[data-preview-state="frozen"]').waitFor({ state: 'visible', timeout: 120_000 });
await page.addStyleTag({ content: '#alteru-guest-banner{display:none!important}' });
await page.locator('#start-button').click();
await page.locator('#sleeping').waitFor({ state: 'hidden', timeout: 120_000 });
await page.evaluate(() => {
  const game = window.__game;
  game.goTo(0.34);
  const target = game.ruins.observationAnchors.firstStone;
  const dx = target.x - game.walker.pos.x;
  const dy = target.y - game.walker.pos.y;
  const dz = target.z - game.walker.pos.z;
  game.walker.yaw = Math.atan2(-dx, -dz) + 0.085;
  game.walker.pitch = Math.atan2(dy, Math.hypot(dx, dz));
  document.querySelector('#hint').hidden = true;
  document.querySelector('#ghost-gesture').hidden = true;
});
await page.waitForFunction(() => document.querySelector('#hud').dataset.clueState === 'nearby');
await page.waitForFunction(() => document.querySelector('#observation').classList.contains('is-helped'), null, { timeout: 7_000 });
const signal = await page.evaluate(() => ({
  ring: !!window.__game.ruins.root.getObjectByName('first-stone-ring'),
  seam: !!window.__game.ruins.root.getObjectByName('first-stone-oxidation-seam'),
  distance: Number(document.querySelector('#hud').dataset.clueDistance),
  copy: document.querySelector('#observation-label').textContent,
}));
if (!signal.ring || !signal.seam || signal.distance > 22
    || !signal.copy.includes('metal-ringed stone')) {
  throw new Error(`Ancient alloy marker unavailable: ${JSON.stringify(signal)}`);
}
await page.screenshot({
  path: fileURLToPath(new URL('platform-layout-clue-alloy-390x844.png', root)),
  fullPage: true,
});
console.log(JSON.stringify(signal));
await context.close();
await browser.close();
