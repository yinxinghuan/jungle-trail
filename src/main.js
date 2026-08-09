import './ui.css';
import { locale, t } from './i18n.js';
import { CHAPTERS, chapterById } from './game/chapters.js';
import { InvestigationSession } from './game/investigation.js';
import { ProgressStore } from './game/progress-store.js';
import { ANALOG_DEAD_ZONE, ANALOG_WALK_EDGE } from './player/gait.js';

document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
const coarseInput = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

const $ = (id) => document.getElementById(id);
const ui = {
  shell: $('shell'), canvas: $('view'), sleeping: $('sleeping'), sleepingCopy: $('sleeping-copy'),
  chapterHeading: $('chapter-heading'), chapterNav: $('chapter-nav'),
  start: $('start-button'), status: $('build-status'), hud: $('hud'),
  progress: $('progress-fill'), landmark: $('landmark-label'), sound: $('sound-button'),
  routePercent: $('route-percent'), hudChapterNumber: $('hud-chapter-number'), map: $('map-button'),
  clueProgress: $('clue-progress'), clueCount: $('clue-count'),
  mission: $('mission'), observation: $('observation'), observationProgress: $('observation-progress'),
  observationLabel: $('observation-label'), clueReveal: $('clue-reveal'),
  clueRevealKicker: $('clue-reveal-kicker'), clueRevealCopy: $('clue-reveal-copy'),
  routeCue: $('route-cue'),
  pause: $('pause-button'), look: $('look-zone'), ghost: $('ghost-gesture'), move: $('move-control'), knob: $('stick-knob'),
  jump: $('jump-button'), hint: $('hint'), paceLabel: $('pace-label'),
  mapPanel: $('map-panel'), mapBackdrop: $('map-backdrop'), mapClose: $('map-close'),
  mapEyebrow: $('map-eyebrow'), mapTitle: $('map-title'), mapSubtitle: $('map-subtitle'),
  mapCloseLabel: $('map-close-label'), mapRoute: $('map-route-base'),
  mapRouteCorridor: $('map-route-corridor'), mapRouteProgress: $('map-route-progress'), mapPlayer: $('map-player'),
  mapScaleLine: $('map-scale-line'), mapScaleLabel: $('map-scale-label'),
  mapEvidenceNodes: $('map-evidence-nodes'), mapLandmarkNodes: $('map-landmark-nodes'),
  mapCanopyLabel: $('map-canopy-label'),
  mapObjectiveLabel: $('map-objective-label'),
  mapObjective: $('map-objective'), mapTraceCount: $('map-trace-count'),
  pausePanel: $('pause-panel'), pauseTitle: $('pause-title'), resume: $('resume-button'), trail: $('trail-button'),
  mode: $('mode-button'),
  complete: $('complete-panel'), completeTitle: $('complete-title'), completeTime: $('complete-time'),
  completeConclusion: $('complete-conclusion'), observe: $('observe-button'), next: $('next-button'),
  completeStats: $('complete-stats'),
  restart: $('restart-button'), error: $('error-panel'),
  errorTitle: $('error-title'), errorCopy: $('error-copy'), retry: $('retry-button'),
};

const icons = {
  sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9v6h4l5 4V5L9 9H5Z"/><path d="M17 9.5c.8.7 1.2 1.5 1.2 2.5s-.4 1.8-1.2 2.5"/></svg>',
  muted: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9v6h4l5 4V5L9 9H5Z"/><path d="m17 10 4 4m0-4-4 4"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6v12M16 6v12"/></svg>',
  jump: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V6m-5 5 5-5 5 5"/><path d="M6 19h12"/></svg>',
};

ui.sleepingCopy.textContent = t('sleepingCopy');
ui.start.textContent = t('enter');
ui.pauseTitle.textContent = t('paused');
ui.resume.textContent = t('resume');
ui.trail.textContent = t('returnTrail');
ui.completeTitle.textContent = t('complete');
ui.observe.textContent = t('observe');
ui.restart.textContent = t('restart');
ui.retry.textContent = t('retry');
ui.jump.innerHTML = `${icons.jump}<span>${t('jump')}</span>`;
ui.sound.innerHTML = icons.sound;
ui.pause.innerHTML = icons.pause;
ui.map.setAttribute('aria-label', t('openMap'));
ui.map.setAttribute('aria-expanded', 'false');
ui.sound.setAttribute('aria-label', t('mute'));
ui.pause.setAttribute('aria-label', t('pause'));
ui.paceLabel.textContent = t('paceIdle');
ui.move.dataset.pace = 'idle';
ui.mapEyebrow.textContent = t('fieldMap');
ui.mapCloseLabel.textContent = t('close');
ui.mapClose.setAttribute('aria-label', t('closeMap'));
ui.mapObjectiveLabel.textContent = t('currentObjective');
ui.mapCanopyLabel.textContent = t('mapCanopy');
ui.mapRoute.closest('svg').setAttribute('aria-label', t('mapAria'));
const progressStore = new ProgressStore();
const bootParams = new URLSearchParams(location.search);
const unlockAll = bootParams.get('unlock') === 'all';
const requestedChapter = chapterById(bootParams.get('chapter'));
let chapter = unlockAll || progressStore.value.unlocked.includes(requestedChapter.id)
  ? requestedChapter : CHAPTERS[0];
let objective = chapter;
let investigation = new InvestigationSession(objective);
let surveyActive = false;
let sessionMetrics = { hints: 0, offroute: 0 };

function renderChapterNav() {
  ui.hudChapterNumber.textContent = String(chapter.number).padStart(2, '0');
  ui.chapterHeading.textContent = `${t('chapterLabel', { n: chapter.number })} · ${t(chapter.titleKey)}`;
  ui.chapterNav.replaceChildren(...CHAPTERS.map((item) => {
    const button = document.createElement('button');
    const unlocked = unlockAll || progressStore.value.unlocked.includes(item.id);
    button.type = 'button';
    button.className = `jt-chapter-nav__item${item.id === chapter.id ? ' is-current' : ''}`;
    button.disabled = !unlocked || item.id === chapter.id;
    button.setAttribute('aria-current', item.id === chapter.id ? 'page' : 'false');
    button.innerHTML = `<b>${String(item.number).padStart(2, '0')}</b><span>${unlocked ? t(item.titleKey) : t('locked')}</span>`;
    if (unlocked && item.id !== chapter.id) button.addEventListener('click', () => {
      const url = new URL(location.href);
      url.searchParams.set('chapter', item.id);
      location.assign(url);
    });
    return button;
  }));
  ui.sleepingCopy.textContent = t(chapter.subtitleKey);
  ui.mission.textContent = t(chapter.missionKey);
}

renderChapterNav();
const renderMode = () => {
  ui.mode.textContent = t(progressStore.value.hintMode === 'expert' ? 'expertMode' : 'quietMode');
};
renderMode();
progressStore.load().then(() => { renderChapterNav(); renderMode(); }).catch(() => {});

ui.clueCount.textContent = t('clueCount', { n: 0, total: objective.evidence.length });
ui.clueRevealKicker.textContent = t('clueKicker');
ui.clueRevealCopy.textContent = t('clueRecorded');

let game = null;
let startedAt = 0;
let muted = false;
let completed = false;
let userPaused = false;
let mapOpen = false;
let docHidden = false;
let offscreen = false;
let hudRaf = 0;
let previousLandmark = -1;
let hintStage = coarseInput ? 'look' : 'done';
let ghostRaf = 0;
let ghostTimers = [];
let userInteracted = false;
let preparing = false;
let sceneReady = false;
let entered = false;
let previewRaf = 0;
let previewTimer = 0;
let missionTimer = 0;
let clueRevealTimer = 0;
let lastHudAt = 0;
let offTrailAt = 0;

function supportsWebGL2() {
  try { return !!document.createElement('canvas').getContext('webgl2'); }
  catch { return false; }
}

function setError(message) {
  ui.errorTitle.textContent = t('startFailed');
  ui.errorCopy.textContent = message;
  ui.error.hidden = false;
  ui.sleeping.setAttribute('aria-busy', 'false');
  ui.sleeping.hidden = true;
  ui.hud.hidden = true;
}

function applyPause() {
  if (!game) return;
  const paused = userPaused || mapOpen || docHidden || offscreen;
  game.setPaused(paused);
  if (muted) game.ambience?.setMuted?.(true);
}

function formatTime(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  return `${minutes}:${String(whole % 60).padStart(2, '0')}`;
}

const LANDMARK_T = [0.02, 0.27, 0.74, 0.86, 0.955];
const MAP_FRAME = { left: 38, right: 222, top: 42, bottom: 382 };
let mapProjection = null;

function landmarkFor(tValue) {
  let found = 0;
  for (let index = 1; index < LANDMARK_T.length; index += 1) {
    if (tValue >= LANDMARK_T[index]) found = index;
  }
  return found;
}

const svgNode = (name) => document.createElementNS('http://www.w3.org/2000/svg', name);

function evidenceTrailT(contract, index) {
  const anchor = game?.observationAnchors?.[contract.anchor];
  if (!anchor || !game?.trail) return (index + 1) / (objective.evidence.length + 1) * objective.endT;
  return game.trail.nearest(anchor.x, anchor.z, {}).t;
}

function updateMapProjection() {
  if (!game?.trail?.samples?.length) return;
  const endT = chapter.endT;
  const source = game.trail.samples.filter((sample) => sample.t <= endT);
  const samples = source.filter((_, index) => index % 8 === 0);
  if (samples.at(-1) !== source.at(-1)) samples.push(source.at(-1));
  const minX = Math.min(...source.map((sample) => sample.x));
  const maxX = Math.max(...source.map((sample) => sample.x));
  const minZ = Math.min(...source.map((sample) => sample.z));
  const maxZ = Math.max(...source.map((sample) => sample.z));
  const width = MAP_FRAME.right - MAP_FRAME.left;
  const height = MAP_FRAME.bottom - MAP_FRAME.top;
  const scale = Math.min(width / Math.max(1, maxX - minX + 24), height / Math.max(1, maxZ - minZ));
  const centreX = (minX + maxX) * 0.5;
  const projectedWidth = (maxX - minX) * scale;
  const projectedHeight = (maxZ - minZ) * scale;
  const originX = (MAP_FRAME.left + MAP_FRAME.right) * 0.5 - centreX * scale;
  const originY = MAP_FRAME.top + (height - projectedHeight) * 0.5;
  mapProjection = {
    scale,
    point(x, z) {
      return { x: originX + x * scale, y: originY + (z - minZ) * scale };
    },
  };
  const routeD = samples.map((sample, index) => {
    const point = mapProjection.point(sample.x, sample.z);
    return `${index ? 'L' : 'M'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
  }).join('');
  ui.mapRoute.setAttribute('d', routeD);
  ui.mapRouteCorridor.setAttribute('d', routeD);
  ui.mapRouteProgress.setAttribute('d', routeD);
  const scaleMetres = 100;
  const scaleWidth = scaleMetres * scale;
  ui.mapScaleLine.setAttribute('d', `M0 0v-5m0 3h${scaleWidth.toFixed(1)}m0-3v5`);
  ui.mapScaleLabel.setAttribute('x', (scaleWidth * 0.5).toFixed(1));
  ui.mapScaleLabel.textContent = `${scaleMetres} m`;
}

function mapPointAt(tValue) {
  if (!mapProjection || !game?.trail) return { x: 130, y: 382 };
  const point = game.trail.pointAt(Math.min(chapter.endT, Math.max(0, tValue)));
  return mapProjection.point(point.x, point.z);
}

function evidenceMapPoint(contract, index) {
  const anchor = game?.observationAnchors?.[contract.anchor];
  return anchor && mapProjection
    ? mapProjection.point(anchor.x, anchor.z)
    : mapPointAt(evidenceTrailT(contract, index));
}

function appendLandmarkGlyph(group, index) {
  const glyph = svgNode('path');
  glyph.setAttribute('class', 'jt-map__landmark-glyph');
  glyph.setAttribute('d', [
    'M-4 5V-5M-7-2h6M-7 5h6',
    'M-7 5-3-4 1 5M-1 5 4-6 8 5',
    'M-7 5V-3h5v8M0 5V-7h7V5M-8 5H8',
    'M-8 5V-5M8 5V-5M-8-5H8M-4 5V-1h8v6',
    'M-7-5c0 5 3 5 3 10M0-5c0 5 3 5 3 10M7-5c0 5-3 5-3 10',
  ][index]);
  group.append(glyph);
}

function renderLandmarks(trailT) {
  const fullNames = t(chapter.landmarksKey);
  const mapNames = t(chapter.mapLandmarksKey || chapter.landmarksKey);
  const current = landmarkFor(trailT);
  const next = trailT >= LANDMARK_T.at(-1) ? current : Math.min(4, current + 1);
  ui.mapLandmarkNodes.replaceChildren(...LANDMARK_T.map((position, index) => {
    const point = mapPointAt(position);
    const group = svgNode('g');
    const state = index < current || trailT >= position ? 'is-passed'
      : index === next ? 'is-next' : 'is-ahead';
    group.setAttribute('class', `jt-map__landmark ${state}${index === current ? ' is-current' : ''}`);
    group.setAttribute('transform', `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`);
    group.setAttribute('aria-label', fullNames[index]);
    const circle = svgNode('circle');
    circle.setAttribute('r', '10');
    group.append(circle);
    appendLandmarkGlyph(group, index);
    const labelLayout = [
      { left: false, y: 4 },
      { left: true, y: 4 },
      { left: false, y: 15 },
      { left: true, y: 2 },
      { left: false, y: -13 },
    ][index];
    const leftSide = labelLayout.left;
    const sign = leftSide ? -1 : 1;
    const connector = svgNode('path');
    connector.setAttribute('class', 'jt-map__landmark-leader');
    connector.setAttribute('d', `M${sign * 11} 0L${sign * 20} ${labelLayout.y}`);
    group.append(connector);
    const label = svgNode('text');
    label.setAttribute('class', 'jt-map__landmark-label');
    label.setAttribute('x', String(sign * 24));
    label.setAttribute('y', String(labelLayout.y + 3));
    label.setAttribute('text-anchor', leftSide ? 'end' : 'start');
    label.textContent = mapNames[index];
    group.append(label);
    return group;
  }));

  const distance = Math.max(0, Math.round((LANDMARK_T[next] - trailT) * game.trail.length / 5) * 5);
  ui.mapObjective.textContent = `${fullNames[next]} · ${t(distance > 0 ? 'distanceRemaining' : 'destinationReached', { n: distance })}`;
}

function renderMap() {
  if (!game) return;
  updateMapProjection();
  const trailT = game.walker.trailT;
  const routeLength = ui.mapRoute.getTotalLength();
  const relative = Math.min(1, Math.max(0, trailT / Math.max(0.01, chapter.endT)));
  const playerPoint = mapProjection.point(game.walker.pos.x, game.walker.pos.z);
  const aheadPoint = mapPointAt(Math.min(objective.endT, trailT + 0.008));
  const tangent = game.trail.tangentAt(trailT);
  const routeYaw = Math.atan2(-tangent.x, -tangent.z);
  let viewDelta = game.walker.yaw - routeYaw;
  while (viewDelta > Math.PI) viewDelta -= Math.PI * 2;
  while (viewDelta < -Math.PI) viewDelta += Math.PI * 2;
  const mapTangentAngle = Math.atan2(aheadPoint.x - playerPoint.x, -(aheadPoint.y - playerPoint.y));
  const playerAngle = (mapTangentAngle + viewDelta) * 180 / Math.PI;
  ui.mapPlayer.setAttribute('transform', `translate(${playerPoint.x.toFixed(2)} ${playerPoint.y.toFixed(2)}) rotate(${playerAngle.toFixed(2)})`);
  ui.mapRouteProgress.style.strokeDasharray = `${(routeLength * relative).toFixed(2)} ${routeLength.toFixed(2)}`;
  ui.mapTitle.textContent = t(chapter.titleKey);
  ui.mapSubtitle.textContent = `${t('chapterLabel', { n: chapter.number })} · ${Math.round(trailT * 100)}%`;
  renderLandmarks(trailT);

  ui.mapEvidenceNodes.replaceChildren();
  investigation.trackers.forEach((tracker, index) => {
    const point = evidenceMapPoint(tracker.contract, index);
    const diamond = svgNode('rect');
    const isCurrent = index === investigation.activeIndex;
    diamond.setAttribute('x', String(point.x - 6));
    diamond.setAttribute('y', String(point.y - 6));
    diamond.setAttribute('width', '12');
    diamond.setAttribute('height', '12');
    diamond.setAttribute('rx', '1');
    diamond.setAttribute('transform', `rotate(45 ${point.x} ${point.y})`);
    diamond.setAttribute('class', `jt-map__evidence${tracker.recorded ? ' is-recorded' : isCurrent ? ' is-current' : ''}`);
    if (isCurrent && !tracker.recorded) {
      const ring = svgNode('circle');
      ring.setAttribute('cx', String(point.x));
      ring.setAttribute('cy', String(point.y));
      ring.setAttribute('r', '14');
      ring.setAttribute('class', 'jt-map__evidence-ring');
      ui.mapEvidenceNodes.append(ring);
    }
    ui.mapEvidenceNodes.append(diamond);

  });
  const recorded = investigation.trackers.filter((tracker) => tracker.recorded).length;
  ui.mapTraceCount.textContent = `${t('surveyTraces')} ${recorded}/${investigation.trackers.length}`;
}

function openMap() {
  if (!game || !entered || mapOpen) return;
  cancelGhostDemo(true);
  game.walker.setMoveInput(0, 0);
  resetStickUi();
  mapOpen = true;
  ui.mapPanel.hidden = false;
  const mapSheet = ui.mapPanel.querySelector('.jt-map__sheet');
  mapSheet.scrollLeft = 0;
  renderMap();
  ui.map.setAttribute('aria-expanded', 'true');
  applyPause();
  requestAnimationFrame(() => {
    ui.mapClose.focus({ preventScroll: true });
    mapSheet.scrollLeft = 0;
  });
}

function closeMap() {
  if (!mapOpen) return;
  mapOpen = false;
  ui.mapPanel.hidden = true;
  ui.map.setAttribute('aria-expanded', 'false');
  applyPause();
  ui.map.focus();
}

function setObservationProgress(value) {
  const progress = Math.min(1, Math.max(0, value));
  ui.observationProgress.style.strokeDashoffset = String(1 - progress);
  ui.hud.dataset.clueProgress = progress.toFixed(3);
}

function completeEvidence(tracker) {
  setObservationProgress(1);
  ui.hud.dataset.clueState = 'recorded';
  ui.observation.hidden = true;
  ui.clueProgress.classList.toggle('is-recorded', investigation.complete);
  ui.clueProgress.classList.remove('is-signaled');
  ui.observation.classList.remove('is-helped');
  ui.clueCount.textContent = t('clueCount', {
    n: investigation.recordedCount, total: objective.evidence.length,
  });
  ui.clueRevealKicker.textContent = t('clueKicker', { n: investigation.recordedCount });
  ui.clueRevealCopy.textContent = t(tracker.contract.recordedKey || 'clueRecorded');
  ui.clueReveal.hidden = false;
  clearTimeout(clueRevealTimer);
  clueRevealTimer = setTimeout(() => { ui.clueReveal.hidden = true; }, 3600);
  try { game?.ambience?.playDiscovery?.(); } catch (_) { /* audio is non-fatal */ }
  navigator.vibrate?.(20);
}

function updateEvidence(now, dt) {
  const tracker = investigation.active;
  if (!game || !tracker || userPaused || docHidden || offscreen || completed) {
    ui.observation.hidden = true;
    return;
  }
  const contract = tracker.contract;
  const anchor = game.observationAnchors?.[contract.anchor];
  if (!anchor) {
    ui.observation.hidden = true;
    ui.hud.dataset.clueState = 'anchor-missing';
    return;
  }
  const probe = game.observationProbe(anchor);
  const result = tracker.update({
    ...probe,
    sprinting: game.walker.isSprinting,
  }, now, dt, {
    helpDelayMs: progressStore.value.hintMode === 'expert' ? 8000 : 4500,
  });
  if (result.announcedNow) {
    ui.clueProgress.classList.add('is-signaled');
    ui.mission.textContent = t(contract.aheadKey || 'clueAhead');
    ui.mission.hidden = false;
    clearTimeout(missionTimer);
    missionTimer = setTimeout(() => { ui.mission.hidden = true; }, 3200);
    try { game.ambience?.playClueHint?.(anchor); } catch (_) { /* audio is non-fatal */ }
  }
  ui.hud.dataset.clueDistance = Number.isFinite(probe.distance) ? probe.distance.toFixed(2) : '';
  ui.hud.dataset.clueCenterDistance = Number.isFinite(probe.centerDistance)
    ? probe.centerDistance.toFixed(3) : '';
  if (!result.nearby) {
    ui.hud.dataset.clueState = result.state;
    ui.observation.hidden = true;
    ui.observation.classList.remove('is-helped');
    setObservationProgress(result.progress);
    return;
  }

  if (hintStage !== 'done') {
    cancelGhostDemo();
    hintStage = 'done';
    ui.hint.hidden = true;
  }

  ui.observation.hidden = false;
  const clueAngle = Math.atan2(probe.screenX, -probe.screenY);
  ui.observation.style.setProperty('--jt-clue-angle', `${clueAngle}rad`);
  setObservationProgress(result.progress);
  if (result.helpedNow) {
    sessionMetrics.hints += 1;
    try { game.ambience?.playClueHint?.(anchor); } catch (_) { /* audio is non-fatal */ }
  }

  ui.observation.classList.toggle('is-aligned', !!result.tracking);
  ui.observation.classList.toggle('is-helped', result.helped && !result.tracking);
  ui.observationLabel.textContent = game.walker.isSprinting
    ? t('clueSprint')
    : result.tracking ? t(contract.focusKey || 'clueFocus')
      : result.helped ? t(contract.searchKey || 'clueSearch')
        : t(contract.nearbyKey || 'clueNearby');
  ui.hud.dataset.clueState = result.state;
  if (result.completed) completeEvidence(tracker);
}

function resetInvestigation() {
  surveyActive = false;
  objective = chapter;
  investigation = new InvestigationSession(objective);
  sessionMetrics = { hints: 0, offroute: 0 };
  game?.chapterLandmarks?.setSurveyVisible(false);
  clearTimeout(clueRevealTimer);
  ui.clueReveal.hidden = true;
  ui.clueProgress.classList.remove('is-recorded');
  ui.clueProgress.classList.remove('is-signaled');
  ui.observation.classList.remove('is-helped');
  ui.clueCount.textContent = t('clueCount', { n: 0, total: objective.evidence.length });
  ui.hud.dataset.clueState = 'roaming';
  setObservationProgress(0);
}

function updateRouteCue(now) {
  if (!game || completed || userPaused || docHidden || offscreen
      || !ui.observation.hidden || !ui.hint.hidden || !ui.mission.hidden) {
    ui.routeCue.hidden = true;
    return;
  }
  const offset = game.walker.trailOffset;
  ui.hud.dataset.trailDistance = offset.dist.toFixed(2);
  if (offset.dist > 2.4) {
    if (!offTrailAt) offTrailAt = now;
    if (now - offTrailAt >= 1200) {
      if (!ui.routeCue.dataset.counted) {
        ui.routeCue.dataset.counted = 'true';
        sessionMetrics.offroute += 1;
      }
      ui.routeCue.textContent = t(offset.viewSide < 0 ? 'trailLeft' : 'trailRight');
      ui.routeCue.hidden = false;
    }
  } else if (offset.dist < 1.5) {
    offTrailAt = 0;
    delete ui.routeCue.dataset.counted;
    ui.routeCue.hidden = true;
  }
}

function updateHud(now = performance.now()) {
  if (!game) return;
  const dt = lastHudAt ? Math.min(0.05, Math.max(0, (now - lastHudAt) / 1000)) : 0;
  lastHudAt = now;
  const trailT = game.walker.trailT;
  ui.progress.style.width = `${Math.min(100, Math.max(2, trailT * 100))}%`;
  ui.routePercent.textContent = `${String(Math.round(trailT * 100)).padStart(2, '0')}%`;
  const landmark = landmarkFor(trailT);
  if (landmark !== previousLandmark) {
    previousLandmark = landmark;
    ui.landmark.textContent = t(chapter.landmarksKey)[landmark];
    ui.landmark.classList.remove('is-revealing');
    requestAnimationFrame(() => ui.landmark.classList.add('is-revealing'));
  }
  updateEvidence(now, dt);
  updateRouteCue(now);
  if (!completed && trailT >= objective.endT && investigation.complete) finishJourney();
  if (!completed && trailT >= objective.endT && !investigation.complete && ui.mission.hidden) {
    ui.mission.textContent = t('evidenceMissing', {
      n: objective.evidence.length - investigation.recordedCount,
    });
    ui.mission.hidden = false;
    clearTimeout(missionTimer);
    missionTimer = setTimeout(() => { ui.mission.hidden = true; }, 3000);
  }
  hudRaf = requestAnimationFrame(updateHud);
}

function finishJourney() {
  completed = true;
  ui.hint.hidden = true;
  const elapsed = (performance.now() - startedAt) / 1000;
  ui.completeTitle.textContent = t(surveyActive ? 'surveyComplete' : 'complete');
  ui.completeTime.textContent = t(surveyActive ? 'surveyTime' : 'time', { time: formatTime(elapsed) });
  ui.completeConclusion.textContent = t(surveyActive ? 'surveyConclusion' : chapter.conclusionKey);
  ui.completeStats.hidden = !surveyActive;
  if (surveyActive) ui.completeStats.textContent = t('surveyStats', sessionMetrics);
  const nextChapter = CHAPTERS[chapter.number];
  ui.next.hidden = surveyActive || !nextChapter;
  if (nextChapter) ui.next.textContent = t('nextChapter', { n: nextChapter.number });
  ui.complete.hidden = false;
  ui.hud.classList.add('is-complete');
  progressStore.update((save) => {
    if (surveyActive) {
      const previous = save.surveyBest[chapter.id]?.time || Infinity;
      save.surveyBest[chapter.id] = {
        time: Math.min(previous, elapsed), mode: save.hintMode,
        hints: sessionMetrics.hints, offroute: sessionMetrics.offroute,
        completedAt: Date.now(),
      };
    } else {
      save.completed[chapter.id] = {
        evidence: investigation.recordedIds(),
        bestTime: Math.min(save.completed[chapter.id]?.bestTime || Infinity, elapsed),
        completedAt: Date.now(),
      };
      const next = CHAPTERS[chapter.number];
      if (next && !save.unlocked.includes(next.id)) save.unlocked.push(next.id);
    }
    return save;
  });
  renderChapterNav();
  navigator.vibrate?.(35);
}

function startSurvey() {
  if (!game) return;
  const candidates = chapter.surveyAnchors;
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  const offset = random[0] % 2;
  const indices = [1 + offset, 3 + offset, 6 + offset].map((index) => Math.min(candidates.length - 1, index));
  const evidence = indices.map((index, order) => ({
    id: `survey-${Date.now()}-${order}`,
    anchor: `survey-${index}`,
    previewRange: 34, range: 19, hold: 1.05 + order * 0.08,
    aheadKey: 'surveyAhead', nearbyKey: 'surveyNearby', searchKey: 'surveySearch',
    focusKey: 'surveyFocus', recordedKey: 'surveyRecorded',
  }));
  objective = {
    ...chapter,
    evidence,
    endT: Math.min(0.96, candidates[indices[indices.length - 1]] + 0.045),
  };
  investigation = new InvestigationSession(objective);
  sessionMetrics = { hints: 0, offroute: 0 };
  surveyActive = true;
  completed = false;
  previousLandmark = -1;
  game.chapterLandmarks?.setSurveyVisible(true);
  game.goTo(Math.max(0.02, candidates[indices[0]] - 0.07));
  startedAt = performance.now();
  ui.complete.hidden = true;
  ui.hud.classList.remove('is-complete');
  ui.clueProgress.classList.remove('is-recorded', 'is-signaled');
  ui.clueCount.textContent = t('clueCount', { n: 0, total: evidence.length });
  ui.mission.textContent = t('surveyAhead');
  ui.mission.hidden = false;
  clearTimeout(missionTimer);
  missionTimer = setTimeout(() => { ui.mission.hidden = true; }, 3000);
}

function returnToTrail() {
  if (!game) return;
  game.goTo(game.walker.trailT);
  offTrailAt = 0;
  ui.routeCue.hidden = true;
  userPaused = false;
  ui.pausePanel.hidden = true;
  applyPause();
}

function setGhostPosition(x, y) {
  ui.ghost.style.left = `${x}px`;
  ui.ghost.style.top = `${y}px`;
}

function cancelGhostDemo(fromUser = false) {
  cancelAnimationFrame(ghostRaf);
  ghostRaf = 0;
  for (const timer of ghostTimers) clearTimeout(timer);
  ghostTimers = [];
  ui.ghost.hidden = true;
  game?.walker.setMoveInput(0, 0);
  if (fromUser) userInteracted = true;
}

function runMoveGhost() {
  if (userInteracted || !game) return cancelGhostDemo();
  const rect = ui.move.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const startY = rect.top + rect.height / 2;
  let progress = 0;
  let previousFrame = performance.now();
  ui.ghost.hidden = false;
  const frame = (now) => {
    if (userInteracted) return cancelGhostDemo();
    progress = Math.min(1, progress + Math.min(50, now - previousFrame) / 800);
    previousFrame = now;
    const eased = 1 - Math.pow(1 - progress, 3);
    setGhostPosition(x, startY - eased * 34);
    game.walker.setMoveInput(0, -0.48);
    if (progress < 1) return void (ghostRaf = requestAnimationFrame(frame));
    game.walker.setMoveInput(0, 0);
    hintStage = 'done';
    ui.hint.hidden = true;
    ghostTimers.push(setTimeout(() => cancelGhostDemo(), 280));
  };
  ghostRaf = requestAnimationFrame(frame);
}

function runLookGhost() {
  if (userInteracted || !game || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const startX = innerWidth * 0.61;
  const startY = innerHeight * 0.46;
  const endX = innerWidth * 0.83;
  let progress = 0;
  let previousFrame = performance.now();
  let previousX = startX;
  ui.ghost.hidden = false;
  const frame = (now) => {
    if (userInteracted) return cancelGhostDemo();
    progress = Math.min(1, progress + Math.min(50, now - previousFrame) / 900);
    previousFrame = now;
    const eased = 0.5 - Math.cos(progress * Math.PI) * 0.5;
    const x = startX + (endX - startX) * eased;
    const y = startY - Math.sin(progress * Math.PI) * 18;
    setGhostPosition(x, y);
    game.walker.lookBy(x - previousX, 0);
    previousX = x;
    if (progress < 1) return void (ghostRaf = requestAnimationFrame(frame));
    hintStage = 'move';
    ui.hint.textContent = t('moveHint');
    ghostTimers.push(setTimeout(runMoveGhost, 520));
  };
  ghostRaf = requestAnimationFrame(frame);
}

function attachJoystick() {
  let pointerId = null;
  const radius = 52;
  const update = (event) => {
    const rect = ui.move.getBoundingClientRect();
    let dx = event.clientX - (rect.left + rect.width / 2);
    let dy = event.clientY - (rect.top + rect.height / 2);
    const length = Math.hypot(dx, dy);
    if (length > radius) { dx *= radius / length; dy *= radius / length; }
    const strength = Math.min(1, Math.hypot(dx, dy) / radius);
    ui.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    game.walker.setMoveInput(dx / radius, dy / radius);
    const pace = strength <= ANALOG_DEAD_ZONE ? 'idle'
      : strength < 0.38 ? 'slow'
        : strength <= ANALOG_WALK_EDGE ? 'walk' : 'fast';
    ui.move.dataset.pace = pace;
    ui.paceLabel.textContent = t(`pace${pace[0].toUpperCase()}${pace.slice(1)}`);
    if (hintStage === 'move') {
      hintStage = 'done';
      ui.hint.hidden = true;
    }
  };
  const end = (event) => {
    if (pointerId !== event.pointerId) return;
    pointerId = null;
    game.walker.setMoveInput(0, 0);
    resetStickUi();
  };
  ui.move.addEventListener('pointerdown', (event) => {
    cancelGhostDemo(true);
    pointerId = event.pointerId;
    ui.move.setPointerCapture(pointerId);
    update(event);
  });
  ui.move.addEventListener('pointermove', (event) => { if (event.pointerId === pointerId) update(event); });
  ui.move.addEventListener('pointerup', end);
  ui.move.addEventListener('pointercancel', end);
}

function resetStickUi() {
  ui.knob.style.transform = 'translate(0, 0)';
  ui.move.dataset.pace = 'idle';
  ui.paceLabel.textContent = t('paceIdle');
}

function attachLook() {
  let pointerId = null;
  let x = 0, y = 0;
  const end = (event) => { if (event.pointerId === pointerId) pointerId = null; };
  ui.look.addEventListener('pointerdown', (event) => {
    cancelGhostDemo(true);
    pointerId = event.pointerId; x = event.clientX; y = event.clientY;
    ui.look.setPointerCapture(pointerId);
  });
  ui.look.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointerId) return;
    game.walker.lookBy(event.clientX - x, event.clientY - y);
    x = event.clientX; y = event.clientY;
    if (hintStage === 'look') {
      hintStage = 'move';
      ui.hint.textContent = t('moveHint');
    }
  });
  ui.look.addEventListener('pointerup', end);
  ui.look.addEventListener('pointercancel', end);
}

function attachActions() {
  ui.jump.addEventListener('pointerdown', (event) => { event.preventDefault(); game.walker.jump(); });
}

function installLifecycle() {
  docHidden = document.hidden;
  document.addEventListener('visibilitychange', () => {
    docHidden = document.hidden;
    applyPause();
  });
  new IntersectionObserver(([entry]) => {
    offscreen = entry.intersectionRatio < 0.15;
    applyPause();
  }, { threshold: [0, 0.15, 0.5] }).observe(ui.canvas);
}

function freezePreview() {
  cancelAnimationFrame(previewRaf);
  clearTimeout(previewTimer);
  previewRaf = 0;
  previewTimer = 0;
  if (!entered) {
    game?.stop();
    if (game && !document.hidden && !offscreen) {
      for (let frame = 0; frame < 6; frame += 1) {
        game.step(0);
        game.renderOnce();
      }
    }
    ui.sleeping.dataset.previewFrozenAt = performance.now().toFixed(1);
    ui.sleeping.dataset.previewState = 'frozen';
    ui.sleeping.classList.add('is-frozen');
  }
}

function startPreview() {
  sceneReady = true;
  ui.shell.classList.add('is-scene-ready');
  ui.sleeping.classList.remove('is-building');
  ui.sleeping.classList.add('is-ready');
  ui.sleeping.setAttribute('aria-busy', 'false');
  ui.start.disabled = false;
  ui.status.textContent = t('entryReady');

  if (matchMedia('(prefers-reduced-motion: reduce)').matches || docHidden || offscreen) {
    ui.sleeping.dataset.previewSkip = matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'reduced-motion'
      : docHidden ? 'document-hidden' : 'offscreen';
    freezePreview();
    return;
  }

  ui.sleeping.dataset.previewState = 'settling';
  game.setPaused(false);
  game.begin();
  previewTimer = setTimeout(() => {
    if (entered || !game) return;
    const duration = 3600;
    const started = performance.now();
    const startYaw = game.walker.yaw;
    const startPitch = game.walker.pitch;
    ui.sleeping.dataset.previewMotionStartedAt = started.toFixed(1);
    ui.sleeping.dataset.previewState = 'motion';
    const frame = (now) => {
      if (entered || !game) return;
      const progress = Math.min(1, (now - started) / duration);
      const eased = 0.5 - Math.cos(progress * Math.PI) * 0.5;
      game.walker.yaw = startYaw - eased * 0.14;
      game.walker.pitch = startPitch + Math.sin(progress * Math.PI) * 0.012;
      if (progress < 1) previewRaf = requestAnimationFrame(frame);
      else freezePreview();
    };
    previewRaf = requestAnimationFrame(frame);
  }, 600);
}

async function prepareScene() {
  if (game || preparing || document.hidden) return;
  preparing = true;
  if (!supportsWebGL2()) return setError(t('webglError'));
  ui.start.disabled = true;
  ui.status.textContent = t('preparing');
  ui.sleeping.classList.add('is-building');
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  try {
    const { startGame } = await import('./app.js');
    ui.status.textContent = t('firstFrame');
    game = startGame(ui.canvas, { autoBegin: false, chapterId: chapter.id });
    game.walker.setTrailAssist(coarseInput ? 0.38 : 0);
    game.ambience?.setMuted?.(muted);
    attachJoystick();
    attachLook();
    attachActions();
    installLifecycle();
    startPreview();
  } catch (error) {
    console.error(error);
    setError(`${t('startFailed')} ${error?.message || ''}`.trim());
  }
}

function enterExperience() {
  if (!game || !sceneReady || entered) return;
  entered = true;
  cancelAnimationFrame(previewRaf);
  clearTimeout(previewTimer);
  previewRaf = 0;
  previewTimer = 0;
  ui.start.disabled = true;
  ui.sleeping.classList.add('is-entering');
  userPaused = false;
  game.setPaused(false);
  game.begin();
  startedAt = performance.now();
  ui.hud.hidden = false;
  ui.mission.textContent = t(chapter.missionKey);
  ui.mission.hidden = false;
  clearTimeout(missionTimer);
  missionTimer = setTimeout(() => { ui.mission.hidden = true; }, 3200);
  ui.sleeping.style.pointerEvents = 'none';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fade = ui.sleeping.animate(
    [{ opacity: 1 }, { opacity: 0 }],
    { duration: reduced ? 1 : 320, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' },
  );
  fade.finished.then(() => { ui.sleeping.hidden = true; }).catch(() => { ui.sleeping.hidden = true; });
  ui.hint.textContent = hintStage === 'look' ? t('lookHint') : '';
  ui.hint.hidden = hintStage === 'done';
  if (hintStage === 'look') ghostTimers.push(setTimeout(runLookGhost, 3800));
  updateHud();
}

ui.start.addEventListener('click', enterExperience);
ui.retry.addEventListener('click', () => location.reload());
ui.map.addEventListener('click', openMap);
ui.mapClose.addEventListener('click', closeMap);
ui.mapBackdrop.addEventListener('click', closeMap);
ui.pause.addEventListener('click', () => {
  cancelGhostDemo(true); userPaused = true; ui.pausePanel.hidden = false; applyPause();
});
ui.resume.addEventListener('click', () => {
  userPaused = false; ui.pausePanel.hidden = true; applyPause();
});
ui.mode.addEventListener('click', () => {
  progressStore.update((save) => {
    save.hintMode = save.hintMode === 'expert' ? 'guided' : 'expert';
    return save;
  });
  renderMode();
});
ui.trail.addEventListener('click', returnToTrail);
ui.sound.addEventListener('click', () => {
  muted = !muted;
  game?.ambience?.setMuted?.(muted);
  ui.sound.innerHTML = muted ? icons.muted : icons.sound;
  ui.sound.setAttribute('aria-label', muted ? t('unmute') : t('mute'));
});
ui.observe.addEventListener('click', startSurvey);
ui.next.addEventListener('click', () => {
  const nextChapter = CHAPTERS[chapter.number];
  if (!nextChapter) return;
  const url = new URL(location.href);
  url.searchParams.set('chapter', nextChapter.id);
  location.assign(url);
});
ui.restart.addEventListener('click', () => {
  if (surveyActive) {
    location.reload();
    return;
  }
  game.goTo(0.02);
  completed = false;
  resetInvestigation();
  previousLandmark = -1;
  startedAt = performance.now();
  ui.complete.hidden = true;
  ui.hud.classList.remove('is-complete');
});

addEventListener('keydown', (event) => {
  if (event.repeat || !entered) return;
  if (event.code === 'KeyM') {
    event.preventDefault();
    if (mapOpen) closeMap(); else openMap();
    return;
  }
  if (event.code !== 'Escape') return;
  if (mapOpen) {
    event.preventDefault();
    closeMap();
    return;
  }
  if (completed) return;
  userPaused = !userPaused;
  ui.pausePanel.hidden = !userPaused;
  applyPause();
});

if (/(^|[#&])manual(&|$)/.test(location.hash)) {
  window.__expeditionQa = {
    completeChapter() {
      investigation.trackers.forEach((tracker) => tracker.reset(true));
      finishJourney();
    },
    openMap,
    closeMap,
    startSurvey,
    state: () => ({
      chapter: chapter.id, surveyActive, completed,
      recorded: investigation.recordedIds(), objective: objective.id,
    }),
  };
}

addEventListener('beforeunload', () => {
  cancelAnimationFrame(hudRaf);
  cancelAnimationFrame(previewRaf);
  clearTimeout(previewTimer);
  clearTimeout(missionTimer);
  clearTimeout(clueRevealTimer);
  cancelGhostDemo();
  game?.dispose();
  progressStore.flush();
});

function bootWhenVisible() {
  if (!document.hidden) {
    requestAnimationFrame(() => requestAnimationFrame(prepareScene));
    return;
  }
  const onVisible = () => {
    if (document.hidden) return;
    document.removeEventListener('visibilitychange', onVisible);
    requestAnimationFrame(() => requestAnimationFrame(prepareScene));
  };
  document.addEventListener('visibilitychange', onVisible);
}

bootWhenVisible();
