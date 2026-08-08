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
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.screenshot({ path: shot('external-guest-entry-390x844.png'), fullPage: true });
await page.addStyleTag({ content: '#alteru-guest-banner{display:none!important}' });
await page.screenshot({ path: shot('platform-layout-entry-390x844.png'), fullPage: true });

await page.locator('#start-button').click();
await page.locator('#sleeping').waitFor({ state: 'hidden', timeout: 120_000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: shot('platform-layout-gameplay-390x844.png'), fullPage: true });

await page.evaluate(() => document.querySelector('#pause-button').click());
await page.screenshot({ path: shot('platform-layout-pause-390x844.png'), fullPage: true });
await page.evaluate(() => document.querySelector('#resume-button').click());

await page.evaluate(() => window.__game.goTo(0.96));
await page.waitForTimeout(500);
await page.screenshot({ path: shot('platform-layout-complete-390x844.png'), fullPage: true });

await page.setViewportSize({ width: 320, height: 568 });
await page.waitForTimeout(500);
await page.screenshot({ path: shot('platform-layout-complete-320x568.png'), fullPage: true });

await browser.close();
