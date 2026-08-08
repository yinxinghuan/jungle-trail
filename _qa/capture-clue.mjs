import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('./ui/', import.meta.url);
await mkdir(root, { recursive: true });
const shot = (name) => fileURLToPath(new URL(name, root));

const aimAtFirstStone = async (page, yawOffset = 0) => {
  await page.evaluate((offset) => {
    const game = window.__game;
    game.goTo(0.34);
    const target = game.ruins.observationAnchors.firstStone;
    const dx = target.x - game.walker.pos.x;
    const dy = target.y - game.walker.pos.y;
    const dz = target.z - game.walker.pos.z;
    game.walker.yaw = Math.atan2(-dx, -dz) + offset;
    game.walker.pitch = Math.atan2(dy, Math.hypot(dx, dz));
  }, yawOffset);
};

const holdAimAtFirstStone = async (page) => {
  await page.evaluate(() => {
    window.__qaHoldAim = true;
    const frame = () => {
      const game = window.__game;
      const target = game.ruins.observationAnchors.firstStone;
      const dx = target.x - game.walker.pos.x;
      const dy = target.y - game.walker.pos.y;
      const dz = target.z - game.walker.pos.z;
      game.walker.yaw = Math.atan2(-dx, -dz);
      game.walker.pitch = Math.atan2(dy, Math.hypot(dx, dz));
      if (window.__qaHoldAim) requestAnimationFrame(frame);
    };
    frame();
  });
};

async function enter(page) {
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await page.locator('#sleeping[data-preview-state="frozen"]').waitFor({ state: 'visible', timeout: 120_000 });
  await page.addStyleTag({ content: '#alteru-guest-banner{display:none!important}' });
  await page.locator('#start-button').click();
  await page.locator('#sleeping').waitFor({ state: 'hidden', timeout: 120_000 });
  const viewport = page.viewportSize();
  await page.touchscreen.tap(Math.floor(viewport.width * 0.76), Math.floor(viewport.height * 0.48));
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  hasTouch: true,
  isMobile: true,
  reducedMotion: 'no-preference',
});
const page = await context.newPage();
await page.addInitScript(() => localStorage.setItem('game_locale', 'en'));
await enter(page);

await aimAtFirstStone(page, 0.26);
await page.waitForFunction(() => document.querySelector('#hud').dataset.clueState === 'nearby');
await page.screenshot({ path: shot('platform-layout-clue-nearby-390x844.png'), fullPage: true });

await aimAtFirstStone(page);
await holdAimAtFirstStone(page);
await page.waitForFunction(() => document.querySelector('#hud').dataset.clueState === 'aligned');
await page.waitForTimeout(420);
const aligned = await page.evaluate(() => ({
  state: document.querySelector('#hud').dataset.clueState,
  progress: Number(document.querySelector('#hud').dataset.clueProgress),
  distance: Number(document.querySelector('#hud').dataset.clueDistance),
}));
if (aligned.state !== 'aligned' || aligned.progress <= 0 || aligned.progress >= 1 || aligned.distance > 18) {
  throw new Error(`Invalid aligned observation: ${JSON.stringify(aligned)}`);
}
await page.screenshot({ path: shot('platform-layout-clue-aligned-390x844.png'), fullPage: true });

const recordedTimeline = [];
for (let sample = 0; sample < 30; sample += 1) {
  recordedTimeline.push(await page.evaluate(() => ({
    state: document.querySelector('#hud').dataset.clueState,
    progress: Number(document.querySelector('#hud').dataset.clueProgress),
    center: Number(document.querySelector('#hud').dataset.clueCenterDistance),
  })));
  if (recordedTimeline.at(-1).state === 'recorded') break;
  await page.waitForTimeout(120);
}
if (recordedTimeline.at(-1).state !== 'recorded') {
  throw new Error(`Observation did not stay aligned: ${JSON.stringify(recordedTimeline)}`);
}
await page.evaluate(() => { window.__qaHoldAim = false; });
const recorded = await page.evaluate(() => ({
  state: document.querySelector('#hud').dataset.clueState,
  progress: Number(document.querySelector('#hud').dataset.clueProgress),
  revealVisible: !document.querySelector('#clue-reveal').hidden,
  count: document.querySelector('#clue-count').textContent,
}));
if (recorded.state !== 'recorded' || recorded.progress !== 1 || !recorded.count.includes('1/1')) {
  throw new Error(`Observation did not complete: ${JSON.stringify(recorded)}`);
}
await page.evaluate(() => { document.querySelector('#clue-reveal').hidden = false; });
await page.screenshot({ path: shot('platform-layout-clue-recorded-390x844.png'), fullPage: true });
await context.close();

const narrowContext = await browser.newContext({
  viewport: { width: 320, height: 568 },
  deviceScaleFactor: 1,
  hasTouch: true,
  isMobile: true,
  reducedMotion: 'reduce',
});
const narrowPage = await narrowContext.newPage();
await narrowPage.addInitScript(() => localStorage.setItem('game_locale', 'zh'));
await enter(narrowPage);
await aimAtFirstStone(narrowPage);
await holdAimAtFirstStone(narrowPage);
await narrowPage.waitForFunction(() => document.querySelector('#hud').dataset.clueState === 'aligned');
await narrowPage.screenshot({ path: shot('platform-layout-clue-aligned-reduced-motion-320x568.png'), fullPage: true });
const narrowRecorded = [];
for (let sample = 0; sample < 30; sample += 1) {
  narrowRecorded.push(await narrowPage.evaluate(() => ({
    state: document.querySelector('#hud').dataset.clueState,
    progress: Number(document.querySelector('#hud').dataset.clueProgress),
    center: Number(document.querySelector('#hud').dataset.clueCenterDistance),
  })));
  if (narrowRecorded.at(-1).state === 'recorded') break;
  await narrowPage.waitForTimeout(120);
}
if (narrowRecorded.at(-1).state !== 'recorded') {
  throw new Error(`Narrow observation did not stay aligned: ${JSON.stringify(narrowRecorded)}`);
}
await narrowPage.evaluate(() => { window.__qaHoldAim = false; });
await narrowPage.evaluate(() => { document.querySelector('#clue-reveal').hidden = false; });
await narrowPage.screenshot({ path: shot('platform-layout-clue-recorded-reduced-motion-320x568.png'), fullPage: true });
await narrowContext.close();

await browser.close();
