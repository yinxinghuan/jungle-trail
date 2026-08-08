import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from './harness.mjs';
import { finish } from './tame.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (key, fallback) => { const i = args.indexOf(`--${key}`); return i < 0 ? fallback : args[i + 1]; };
const chapter = flag('chapter', 'trail-remembers');
const width = Number(flag('w', 390));
const height = Number(flag('h', 844));
const external = args.includes('--external');
const state = flag('state', 'entry');
const tag = `${external ? 'external-guest' : 'platform-layout'}-${chapter}-${state}-${width}x${height}`;
const out = path.join(ROOT, '_qa', 'ui', `${tag}.png`);
fs.mkdirSync(path.dirname(out), { recursive: true });

await run({
  width, height, hash: 'manual&tier=low',
  query: [
    `chapter=${encodeURIComponent(chapter)}`,
    'unlock=all',
    ...(external ? [] : ['api_origin=https%3A%2F%2Faigram.app', 'telegram_id=qa-visual']),
  ].join('&'),
  root: path.join(ROOT, 'dist'),
}, async ({ page, errs }) => {
  if (!external) await page.addStyleTag({ content: '#alteru-guest-banner{display:none!important}' });
  await page.waitForTimeout(250);
  if (state !== 'entry') {
    await page.click('#start-button');
    await page.waitForTimeout(450);
    if (state === 'gameplay') await page.evaluate(() => { window.__game.goTo(0.34); window.__game.warp(1); });
    if (state === 'pause') await page.click('#pause-button');
    if (state === 'complete') await page.evaluate(() => window.__expeditionQa.completeChapter());
    if (state === 'survey') {
      await page.evaluate(() => window.__expeditionQa.completeChapter());
      await page.click('#observe-button');
      await page.waitForTimeout(150);
    }
    if (state === 'complete') await page.waitForTimeout(850);
  }
  await page.screenshot({ path: out });
  const layout = await page.evaluate(() => ({
    chapter: document.querySelector('#chapter-heading')?.textContent,
    navButtons: document.querySelectorAll('.jt-chapter-nav__item').length,
    startRect: document.querySelector('#start-button')?.getBoundingClientRect().toJSON(),
    overflow: document.documentElement.scrollHeight > innerHeight || document.documentElement.scrollWidth > innerWidth,
    game: window.__game?.info(),
  }));
  fs.writeFileSync(out.replace(/\.png$/, '.json'), JSON.stringify({ layout, errors: errs }, null, 2));
  console.log(JSON.stringify(layout, null, 2));
  console.log(`→ ${path.relative(ROOT, out)}`);
});

finish(process.exitCode || 0);
