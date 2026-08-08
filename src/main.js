import './ui.css';
import { locale, t } from './i18n.js';

document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
const coarseInput = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

const $ = (id) => document.getElementById(id);
const ui = {
  canvas: $('view'), sleeping: $('sleeping'), sleepingCopy: $('sleeping-copy'),
  start: $('start-button'), status: $('build-status'), hud: $('hud'),
  progress: $('progress-fill'), landmark: $('landmark-label'), sound: $('sound-button'),
  pause: $('pause-button'), look: $('look-zone'), ghost: $('ghost-gesture'), move: $('move-control'), knob: $('stick-knob'),
  sprint: $('sprint-button'), jump: $('jump-button'), hint: $('hint'),
  pausePanel: $('pause-panel'), pauseTitle: $('pause-title'), resume: $('resume-button'), trail: $('trail-button'),
  complete: $('complete-panel'), completeTitle: $('complete-title'), completeTime: $('complete-time'),
  observe: $('observe-button'), restart: $('restart-button'), error: $('error-panel'),
  errorTitle: $('error-title'), errorCopy: $('error-copy'), retry: $('retry-button'),
};

const icons = {
  sound: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9v6h4l5 4V5L9 9H5Z"/><path d="M17 9.5c.8.7 1.2 1.5 1.2 2.5s-.4 1.8-1.2 2.5"/></svg>',
  muted: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9v6h4l5 4V5L9 9H5Z"/><path d="m17 10 4 4m0-4-4 4"/></svg>',
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6v12M16 6v12"/></svg>',
  jump: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V6m-5 5 5-5 5 5"/><path d="M6 19h12"/></svg>',
  sprint: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17c4-1 6-5 7-10m-5 4 5-4 4 3m-6 4 3 2 5 1"/></svg>',
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
ui.sprint.innerHTML = `${icons.sprint}<span>${t('sprint')}</span>`;
ui.sound.innerHTML = icons.sound;
ui.pause.innerHTML = icons.pause;
ui.sound.setAttribute('aria-label', t('mute'));
ui.pause.setAttribute('aria-label', t('pause'));

let game = null;
let startedAt = 0;
let muted = false;
let completed = false;
let userPaused = false;
let docHidden = false;
let offscreen = false;
let hudRaf = 0;
let previousLandmark = -1;
let hintStage = coarseInput ? 'look' : 'done';
let ghostRaf = 0;
let ghostTimers = [];
let userInteracted = false;

function supportsWebGL2() {
  try { return !!document.createElement('canvas').getContext('webgl2'); }
  catch { return false; }
}

function setError(message) {
  ui.errorTitle.textContent = t('startFailed');
  ui.errorCopy.textContent = message;
  ui.error.hidden = false;
  ui.sleeping.hidden = true;
  ui.hud.hidden = true;
}

function applyPause() {
  if (!game) return;
  const paused = userPaused || docHidden || offscreen;
  game.setPaused(paused);
  if (muted) game.ambience?.setMuted?.(true);
}

function formatTime(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  return `${minutes}:${String(whole % 60).padStart(2, '0')}`;
}

function landmarkFor(tValue) {
  if (tValue >= 0.955) return 4;
  if (tValue >= 0.86) return 3;
  if (tValue >= 0.74) return 2;
  if (tValue >= 0.27) return 1;
  return 0;
}

function updateHud() {
  if (!game) return;
  const trailT = game.walker.trailT;
  ui.progress.style.width = `${Math.min(100, Math.max(2, trailT * 100))}%`;
  const landmark = landmarkFor(trailT);
  if (landmark !== previousLandmark) {
    previousLandmark = landmark;
    ui.landmark.textContent = t('landmarks')[landmark];
    ui.landmark.classList.remove('is-revealing');
    requestAnimationFrame(() => ui.landmark.classList.add('is-revealing'));
  }
  if (!completed && trailT >= 0.955) finishJourney();
  hudRaf = requestAnimationFrame(updateHud);
}

function finishJourney() {
  completed = true;
  ui.hint.hidden = true;
  const elapsed = (performance.now() - startedAt) / 1000;
  ui.completeTime.textContent = t('time', { time: formatTime(elapsed) });
  ui.complete.hidden = false;
  ui.hud.classList.add('is-complete');
  navigator.vibrate?.(35);
}

function returnToTrail() {
  if (!game) return;
  game.goTo(game.walker.trailT);
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
    ui.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    game.walker.setMoveInput(dx / radius, dy / radius);
    if (hintStage === 'move') {
      hintStage = 'done';
      ui.hint.hidden = true;
    }
  };
  const end = (event) => {
    if (pointerId !== event.pointerId) return;
    pointerId = null;
    game.walker.setMoveInput(0, 0);
    ui.knob.style.transform = 'translate(0, 0)';
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
  const sprint = (active) => game?.walker.setSprinting(active);
  ui.sprint.addEventListener('pointerdown', (event) => {
    event.preventDefault(); ui.sprint.setPointerCapture(event.pointerId); sprint(true);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    ui.sprint.addEventListener(type, () => sprint(false));
  }
}

function installLifecycle() {
  document.addEventListener('visibilitychange', () => {
    docHidden = document.hidden;
    applyPause();
  });
  new IntersectionObserver(([entry]) => {
    offscreen = entry.intersectionRatio < 0.15;
    applyPause();
  }, { threshold: [0, 0.15, 0.5] }).observe(ui.canvas);
}

async function start() {
  if (game) return;
  if (!supportsWebGL2()) return setError(t('webglError'));
  ui.start.disabled = true;
  ui.status.textContent = t('preparing');
  ui.sleeping.classList.add('is-building');
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  try {
    const { startGame } = await import('./app.js');
    ui.status.textContent = t('firstFrame');
    game = startGame(ui.canvas);
    game.ambience?.setMuted?.(muted);
    attachJoystick();
    attachLook();
    attachActions();
    installLifecycle();
    startedAt = performance.now();
    ui.sleeping.hidden = true;
    ui.hud.hidden = false;
    ui.hint.textContent = hintStage === 'look' ? t('lookHint') : '';
    ui.hint.hidden = hintStage === 'done';
    if (hintStage === 'look') ghostTimers.push(setTimeout(runLookGhost, 1200));
    updateHud();
  } catch (error) {
    console.error(error);
    setError(`${t('startFailed')} ${error?.message || ''}`.trim());
  }
}

ui.start.addEventListener('click', start);
ui.retry.addEventListener('click', () => location.reload());
ui.pause.addEventListener('click', () => {
  cancelGhostDemo(true); userPaused = true; ui.pausePanel.hidden = false; applyPause();
});
ui.resume.addEventListener('click', () => {
  userPaused = false; ui.pausePanel.hidden = true; applyPause();
});
ui.trail.addEventListener('click', returnToTrail);
ui.sound.addEventListener('click', () => {
  muted = !muted;
  game?.ambience?.setMuted?.(muted);
  ui.sound.innerHTML = muted ? icons.muted : icons.sound;
  ui.sound.setAttribute('aria-label', muted ? t('unmute') : t('mute'));
});
ui.observe.addEventListener('click', () => { ui.complete.hidden = true; });
ui.restart.addEventListener('click', () => {
  game.goTo(0.02);
  completed = false;
  previousLandmark = -1;
  startedAt = performance.now();
  ui.complete.hidden = true;
  ui.hud.classList.remove('is-complete');
});

addEventListener('beforeunload', () => {
  cancelAnimationFrame(hudRaf);
  cancelGhostDemo();
  game?.dispose();
});
