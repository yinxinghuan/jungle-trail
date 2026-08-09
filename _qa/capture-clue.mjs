import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('./ui/', import.meta.url);
await mkdir(root, { recursive: true });
const shot = (name) => fileURLToPath(new URL(name, root));
const qaUrl = process.env.QA_URL || 'http://127.0.0.1:4173/';

const aimAtFirstStone = async (page, yawOffset = 0) => {
  await page.evaluate((offset) => {
    const game = window.__game;
    game.goTo(0.34);
    const target = game.ruins.observationAnchors.firstStone;
    const dx = target.x - game.walker.pos.x;
    const dy = target.y - game.camera.position.y;
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
      const dy = target.y - game.camera.position.y;
      const dz = target.z - game.walker.pos.z;
      game.walker.yaw = Math.atan2(-dx, -dz);
      game.walker.pitch = Math.atan2(dy, Math.hypot(dx, dz));
      if (window.__qaHoldAim) requestAnimationFrame(frame);
    };
    frame();
  });
};

async function enter(page) {
  await page.goto(qaUrl, { waitUntil: 'domcontentloaded' });
  await page.locator('#sleeping[data-preview-state="frozen"]').waitFor({ state: 'visible', timeout: 120_000 });
  await page.addStyleTag({ content: '#alteru-guest-banner,#alteru-guest-login{display:none!important}' });
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
await page.waitForFunction(() => document.querySelector('#observation').classList.contains('is-helped'), null, { timeout: 7_000 });
const helped = await page.evaluate(() => ({
  text: document.querySelector('#observation-label').textContent,
  angle: getComputedStyle(document.querySelector('#observation')).getPropertyValue('--jt-clue-angle'),
}));
if (!helped.text.includes('about') || !helped.angle.trim()) {
  throw new Error(`Clue assistance did not become specific: ${JSON.stringify(helped)}`);
}
await page.screenshot({ path: shot('platform-layout-clue-guided-390x844.png'), fullPage: true });

await aimAtFirstStone(page);
await holdAimAtFirstStone(page);
await page.waitForFunction(() => document.querySelector('#hud').dataset.clueState === 'aligned');
await page.waitForTimeout(420);
const aligned = await page.evaluate(() => ({
  state: document.querySelector('#hud').dataset.clueState,
  progress: Number(document.querySelector('#hud').dataset.clueProgress),
  distance: Number(document.querySelector('#hud').dataset.clueDistance),
}));
if (aligned.state !== 'aligned' || aligned.progress <= 0 || aligned.progress >= 1 || aligned.distance > 22) {
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
  recordedIds: [...window.__game.ruins._investigationFeedback.recorded],
}));
if (!recorded.recordedIds.includes('alloy-marker') || !recorded.count.includes('1/3')) {
  throw new Error(`Observation did not complete: ${JSON.stringify(recorded)}`);
}
await page.evaluate(() => { document.querySelector('#clue-reveal').hidden = false; });
await page.screenshot({ path: shot('platform-layout-clue-recorded-390x844.png'), fullPage: true });

await page.waitForTimeout(1250);
await aimAtFirstStone(page);
await page.screenshot({ path: shot('platform-layout-clue-activated-world-390x844.png'), fullPage: true });

await page.evaluate(() => {
  const game = window.__game;
  game.goTo(0.86);
  const target = game.observationAnchors.gateViewpoint;
  const dx = target.x - game.walker.pos.x;
  const dz = target.z - game.walker.pos.z;
  game.walker.yaw = Math.atan2(-dx, -dz) + Math.PI;
  game.walker.pitch = 0;
  document.querySelector('#clue-reveal').hidden = true;
});
await page.waitForFunction(() => document.querySelector('#hud').dataset.clueStage === 'positioning', null, { timeout: 5_000 });
await page.waitForTimeout(700);
const gateHelp = await page.evaluate(() => ({
  text: document.querySelector('#observation-label').textContent,
  bearing: Number(document.querySelector('#hud').dataset.clueBearing),
  distance: Number(document.querySelector('#hud').dataset.clueGuidanceDistance),
  emissive: window.__game.ruins.evidenceVisuals.gate.alloy.emissiveIntensity,
  waypointVisible: window.__game.ruins.evidenceVisuals.gate.waypoint.visible,
  waypointOpacity: window.__game.ruins.evidenceVisuals.gate.waypointMaterial.opacity,
}));
if (!gateHelp.text.includes('STEP 1') || !gateHelp.text.includes('No tapping')
    || !gateHelp.text.includes('turn around') || Math.abs(gateHelp.bearing) < 2.3
    || gateHelp.distance > 32 || gateHelp.emissive <= 0.12
    || !gateHelp.waypointVisible || gateHelp.waypointOpacity <= 0.5) {
  throw new Error(`Water-gate recovery guidance is not legible: ${JSON.stringify(gateHelp)}`);
}
await page.screenshot({ path: shot('platform-layout-gate-step1-positioning-390x844.png'), fullPage: true });

await page.evaluate(() => {
  const game = window.__game;
  game.goTo(0.80);
  const seams = [game.observationAnchors.gateLeftSeam, game.observationAnchors.gateRightSeam];
  const target = seams.reduce((nearest, point) => (
    game.walker.pos.distanceTo(point) < game.walker.pos.distanceTo(nearest) ? point : nearest
  ));
  const dx = target.x - game.walker.pos.x;
  const dy = target.y - game.camera.position.y;
  const dz = target.z - game.walker.pos.z;
  game.walker.yaw = Math.atan2(-dx, -dz) + 0.32;
  game.walker.pitch = Math.atan2(dy, Math.hypot(dx, dz));
});
await page.waitForFunction(() => document.querySelector('#hud').dataset.clueStage === 'observing', null, { timeout: 5_000 });
const gateReady = await page.evaluate(() => document.querySelector('#observation-label').textContent);
if (!gateReady.includes('STEP 2') || !gateReady.includes('hold 0.8 s')) {
  throw new Error(`Water-gate observation step is unclear: ${gateReady}`);
}
await page.screenshot({ path: shot('platform-layout-gate-step2-ready-390x844.png'), fullPage: true });

await page.evaluate(() => {
  window.__qaHoldGate = true;
  const frame = () => {
    const game = window.__game;
    const seams = [game.observationAnchors.gateLeftSeam, game.observationAnchors.gateRightSeam];
    const target = seams.reduce((nearest, point) => (
      game.walker.pos.distanceTo(point) < game.walker.pos.distanceTo(nearest) ? point : nearest
    ));
    const dx = target.x - game.walker.pos.x;
    const dy = target.y - game.camera.position.y;
    const dz = target.z - game.walker.pos.z;
    game.walker.yaw = Math.atan2(-dx, -dz);
    game.walker.pitch = Math.atan2(dy, Math.hypot(dx, dz));
    if (window.__qaHoldGate) requestAnimationFrame(frame);
  };
  frame();
});
try {
  await page.waitForFunction(() => document.querySelector('#hud').dataset.clueStage === 'recording', null, { timeout: 3_000 });
} catch (error) {
  const diagnostic = await page.evaluate(() => {
    const game = window.__game;
    const left = { ...game.observationProbe(game.observationAnchors.gateLeftSeam) };
    const right = { ...game.observationProbe(game.observationAnchors.gateRightSeam) };
    return {
      stage: document.querySelector('#hud').dataset.clueStage,
      state: document.querySelector('#hud').dataset.clueState,
      guidanceDistance: document.querySelector('#hud').dataset.clueGuidanceDistance,
      sprinting: game.walker.isSprinting,
      left,
      right,
    };
  });
  throw new Error(`Water-gate hold never entered recording: ${JSON.stringify(diagnostic)}`, { cause: error });
}
await page.waitForTimeout(260);
await page.screenshot({ path: shot('platform-layout-gate-step2-recording-390x844.png'), fullPage: true });
const gateTimeline = [];
for (let sample = 0; sample < 50; sample += 1) {
  gateTimeline.push(await page.evaluate(() => {
    const game = window.__game;
    const left = { ...game.observationProbe(game.observationAnchors.gateLeftSeam) };
    const right = { ...game.observationProbe(game.observationAnchors.gateRightSeam) };
    return {
      recorded: game.ruins._investigationFeedback.recorded.has('gate-axis'),
      state: document.querySelector('#hud').dataset.clueState,
      stage: document.querySelector('#hud').dataset.clueStage,
      progress: Number(document.querySelector('#hud').dataset.clueProgress),
      center: Number(document.querySelector('#hud').dataset.clueCenterDistance),
      left: { visible: left.visible, center: left.centerDistance, distance: left.distance },
      right: { visible: right.visible, center: right.centerDistance, distance: right.distance },
    };
  }));
  if (gateTimeline.at(-1).recorded) break;
  await page.waitForTimeout(100);
}
if (!gateTimeline.at(-1).recorded) {
  throw new Error(`Water-gate gaze did not complete: ${JSON.stringify(gateTimeline.slice(-5))}`);
}
await page.evaluate(() => { window.__qaHoldGate = false; });
const gateRecorded = await page.evaluate(() => ({
  count: document.querySelector('#clue-count').textContent,
  copy: document.querySelector('#clue-reveal-copy').textContent,
  waypointVisible: window.__game.ruins.evidenceVisuals.gate.waypoint.visible,
}));
if (!gateRecorded.count.includes('2/3') || !gateRecorded.copy.includes('No mechanism to open')) {
  throw new Error(`Water-gate completion is unclear: ${JSON.stringify(gateRecorded)}`);
}
await page.evaluate(() => { document.querySelector('#clue-reveal').hidden = false; });
await page.waitForTimeout(520);
const waypointAfterRecord = await page.evaluate(
  () => window.__game.ruins.evidenceVisuals.gate.waypointMaterial.opacity,
);
if (waypointAfterRecord > 0.1) {
  throw new Error(`Water-gate waypoint did not retire after recording: ${waypointAfterRecord}`);
}
await page.screenshot({ path: shot('platform-layout-gate-recorded-pass-through-390x844.png'), fullPage: true });
await context.close();

if (!process.env.QA_PRIMARY_ONLY) {
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
await narrowPage.evaluate(() => {
  const game = window.__game;
  game.goTo(0.86);
  const target = game.observationAnchors.gateViewpoint;
  const dx = target.x - game.walker.pos.x;
  const dz = target.z - game.walker.pos.z;
  game.walker.yaw = Math.atan2(-dx, -dz) + Math.PI;
  game.walker.pitch = 0;
  document.querySelector('#clue-reveal').hidden = true;
});
await narrowPage.waitForFunction(() => document.querySelector('#hud').dataset.clueStage === 'positioning', null, { timeout: 5_000 });
const narrowGate = await narrowPage.evaluate(() => ({
  text: document.querySelector('#observation-label').textContent,
  waypointVisible: window.__game.ruins.evidenceVisuals.gate.waypoint.visible,
}));
if (!narrowGate.text.includes('步骤 1') || !narrowGate.text.includes('无需点击')
    || !narrowGate.waypointVisible) {
  throw new Error(`Narrow gate positioning is unclear: ${JSON.stringify(narrowGate)}`);
}
await narrowPage.screenshot({
  path: shot('platform-layout-gate-step1-positioning-reduced-motion-320x568.png'),
  fullPage: true,
});
await narrowContext.close();
}

await browser.close();
