import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('./ui/', import.meta.url);
await mkdir(root, { recursive: true });
const shot = (name) => fileURLToPath(new URL(name, root));

const browser = await chromium.launch({ headless: true });
const requestedWidth = Number(process.argv[2] || 0);
const targets = [
  { width: 390, height: 844, locale: 'en' },
  { width: 320, height: 568, locale: 'zh' },
].filter((target) => !requestedWidth || target.width === requestedWidth);
for (const target of targets) {
  const context = await browser.newContext({
    viewport: { width: target.width, height: target.height },
    deviceScaleFactor: 1, hasTouch: true, isMobile: true, reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.addInitScript((locale) => localStorage.setItem('game_locale', locale), target.locale);
  await page.goto('http://127.0.0.1:4173/#manual', { waitUntil: 'domcontentloaded' });
  await page.locator('#sleeping[data-preview-state="frozen"]').waitFor({ state: 'visible', timeout: 120_000 });
  await page.addStyleTag({ content: '#alteru-guest-banner,#alteru-guest-login{display:none!important}' });
  await page.locator('#start-button').click();
  await page.locator('#sleeping').waitFor({ state: 'hidden', timeout: 120_000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: shot(`platform-layout-field-hud-${target.width}x${target.height}.png`), fullPage: true });
  await page.locator('#map-button').click();
  await page.locator('#map-panel').waitFor({ state: 'visible' });
  await page.screenshot({ path: shot(`platform-layout-field-map-${target.width}x${target.height}.png`), fullPage: true });
  const state = await page.evaluate(() => ({
    mapVisible: !document.querySelector('#map-panel').hidden,
    paused: window.__game.paused,
    controls: [...document.querySelectorAll('#map-button,#sound-button,#pause-button,#jump-button')]
      .map((node) => ({ id: node.id, width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })),
    mapRect: document.querySelector('.jt-map__sheet').getBoundingClientRect().toJSON(),
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    overflowY: document.documentElement.scrollHeight - document.documentElement.clientHeight,
    traceCount: document.querySelectorAll('#map-evidence-list li').length,
  }));
  if (!state.mapVisible || !state.paused || state.traceCount !== 3
      || state.overflowX > 0 || state.overflowY > 0
      || state.controls.some((control) => control.width < 44 || control.height < 44)) {
    throw new Error(`Field UI contract failed at ${target.width}x${target.height}: ${JSON.stringify(state)}`);
  }
  console.log(JSON.stringify({ target, state }));
  await context.close();
}
await browser.close();
