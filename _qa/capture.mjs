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
  reducedMotion: 'no-preference',
});
const page = await context.newPage();
await page.addInitScript(() => localStorage.setItem('game_locale', 'en'));
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
await page.locator('#sleeping.is-ready').waitFor({ state: 'visible', timeout: 120_000 });
const readyState = await page.evaluate(() => ({
  previewState: document.querySelector('#sleeping').dataset.previewState,
  previewSkip: document.querySelector('#sleeping').dataset.previewSkip || null,
  reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  hidden: document.hidden,
  running: window.__game.running,
  canvasRect: document.querySelector('#view').getBoundingClientRect().toJSON(),
}));
console.log(JSON.stringify({ readyState }));
await page.waitForFunction(() => document.querySelector('#sleeping').dataset.previewState === 'motion', null, { timeout: 10_000 });
await page.waitForTimeout(900);
await page.screenshot({ path: shot('external-guest-entry-preview-motion-390x844.png'), fullPage: true });
await page.addStyleTag({ content: '#alteru-guest-banner{display:none!important}' });
await page.screenshot({ path: shot('platform-layout-entry-preview-motion-390x844.png'), fullPage: true });
await page.waitForFunction(() => document.querySelector('#sleeping').dataset.previewState === 'frozen', null, { timeout: 10_000 });
await page.screenshot({ path: shot('platform-layout-entry-frozen-390x844.png'), fullPage: true });

const frozenState = await page.evaluate(() => ({
  running: window.__game.running,
  sceneReady: document.querySelector('#shell').classList.contains('is-scene-ready'),
  entryVisible: !document.querySelector('#sleeping').hidden,
  hudHidden: document.querySelector('#hud').hidden,
  motionDuration: Number(document.querySelector('#sleeping').dataset.previewFrozenAt)
    - Number(document.querySelector('#sleeping').dataset.previewMotionStartedAt),
}));
if (frozenState.running || !frozenState.sceneReady || !frozenState.entryVisible || !frozenState.hudHidden || frozenState.motionDuration < 3500) {
  throw new Error(`Entry did not freeze correctly: ${JSON.stringify(frozenState)}`);
}

await page.locator('#start-button').click();
await page.locator('#sleeping').waitFor({ state: 'hidden', timeout: 120_000 });
await page.waitForTimeout(1500);
const enteredState = await page.evaluate(() => ({
  running: window.__game.running,
  hudHidden: document.querySelector('#hud').hidden,
}));
if (!enteredState.running || enteredState.hudHidden) {
  throw new Error(`Entry did not hand off correctly: ${JSON.stringify(enteredState)}`);
}
await page.screenshot({ path: shot('platform-layout-gameplay-after-entry-390x844.png'), fullPage: true });

await page.evaluate(() => document.querySelector('#pause-button').click());
await page.screenshot({ path: shot('platform-layout-pause-390x844.png'), fullPage: true });
await page.evaluate(() => document.querySelector('#resume-button').click());

await page.evaluate(() => window.__game.goTo(0.96));
await page.waitForTimeout(500);
await page.screenshot({ path: shot('platform-layout-complete-390x844.png'), fullPage: true });

await page.setViewportSize({ width: 320, height: 568 });
await page.waitForTimeout(500);
await page.screenshot({ path: shot('platform-layout-complete-320x568.png'), fullPage: true });

const narrowContext = await browser.newContext({
  viewport: { width: 320, height: 568 },
  deviceScaleFactor: 1,
  hasTouch: true,
  isMobile: true,
  reducedMotion: 'reduce',
});
const narrowPage = await narrowContext.newPage();
await narrowPage.addInitScript(() => localStorage.setItem('game_locale', 'zh'));
await narrowPage.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
await narrowPage.locator('#sleeping[data-preview-state="frozen"]').waitFor({ state: 'visible', timeout: 120_000 });
await narrowPage.addStyleTag({ content: '#alteru-guest-banner{display:none!important}' });
await narrowPage.screenshot({ path: shot('platform-layout-entry-frozen-reduced-motion-320x568.png'), fullPage: true });
await narrowContext.close();

await browser.close();
