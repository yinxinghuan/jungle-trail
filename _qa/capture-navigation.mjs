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
await page.addInitScript(() => localStorage.setItem('game_locale', 'en'));
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
await page.locator('#sleeping[data-preview-state="frozen"]').waitFor({ state: 'visible', timeout: 120_000 });
await page.addStyleTag({ content: '#alteru-guest-banner{display:none!important}' });
await page.locator('#start-button').click();
await page.locator('#sleeping').waitFor({ state: 'hidden', timeout: 120_000 });
await page.evaluate(() => {
  // Establish the post-onboarding gameplay state so transient route guidance
  // is assessed without the earlier look tutorial competing for attention.
  document.querySelector('#hint').hidden = true;
  document.querySelector('#ghost-gesture').hidden = true;
});

const steering = await page.evaluate(() => {
  const game = window.__game;
  game.setPaused(true);
  game.goTo(0.10);
  game.walker.yaw += 0.68;
  game.walker.setTrailAssist(0.38).setMoveInput(0, -1);
  let peakDistance = 0;
  for (let i = 0; i < 300; i += 1) {
    game.walker.update(1 / 30);
    peakDistance = Math.max(peakDistance, game.walker.trailOffset.dist);
  }
  game.walker.setMoveInput(0, 0);
  return { peakDistance, progress: game.walker.trailT };
});
if (steering.peakDistance > 3.4 || steering.progress < 0.115) {
  throw new Error(`Trail assist did not contain forward travel: ${JSON.stringify(steering)}`);
}

await page.evaluate(() => {
  const game = window.__game;
  game.goTo(0.30);
  game.setPaused(false);
});
await page.waitForFunction(() => document.querySelector('#hud').dataset.clueState === 'signaled');
const signal = await page.evaluate(() => ({
  distance: Number(document.querySelector('#hud').dataset.clueDistance),
  mission: document.querySelector('#mission').textContent,
  visible: !document.querySelector('#mission').hidden,
}));
if (!signal.visible || signal.distance > 34 || !signal.mission.includes('stone')) {
  throw new Error(`Clue preview did not announce: ${JSON.stringify(signal)}`);
}
await page.waitForTimeout(520);
await page.evaluate(() => {
  // SwiftShader full-page capture can exceed the product's 3.2 s transient.
  // Freeze an identical post-assertion DOM copy for composition evidence only.
  const mission = document.querySelector('#mission');
  const evidence = mission.cloneNode(true);
  evidence.id = 'qa-mission-evidence';
  evidence.hidden = false;
  evidence.style.animation = 'none';
  mission.after(evidence);
});
await page.screenshot({ path: shot('platform-layout-clue-signal-390x844.png'), fullPage: true });

await page.evaluate(() => {
  const game = window.__game;
  document.querySelector('#qa-mission-evidence')?.remove();
  document.querySelector('#mission').hidden = true;
  game.goTo(0.19);
  const samples = game.trail.samples;
  const tan = samples[Math.round(game.walker.trailT * (samples.length - 1))];
  game.walker.pos.x += -tan.tz * 3.2;
  game.walker.pos.z += tan.tx * 3.2;
});
await page.waitForFunction(() => !document.querySelector('#route-cue').hidden, null, { timeout: 7000 });
const route = await page.evaluate(() => ({
  distance: Number(document.querySelector('#hud').dataset.trailDistance),
  copy: document.querySelector('#route-cue').textContent,
}));
if (route.distance < 2.4 || !route.copy.includes('trail')) {
  throw new Error(`Route recovery cue did not appear: ${JSON.stringify(route)}`);
}
await page.screenshot({ path: shot('platform-layout-route-recovery-390x844.png'), fullPage: true });

console.log(JSON.stringify({ steering, signal, route }));
await context.close();
await browser.close();
