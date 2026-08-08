import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

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
await page.addStyleTag({ content: '#alteru-guest-banner{display:none!important}' });
await page.locator('#start-button').click();
await page.locator('#sleeping').waitFor({ state: 'hidden', timeout: 120_000 });
await page.waitForTimeout(1500);
await page.screenshot({
  path: fileURLToPath(new URL('./ui/platform-layout-ghost-look-390x844.png', import.meta.url)),
  fullPage: true,
});
await browser.close();
