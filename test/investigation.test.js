import test from 'node:test';
import assert from 'node:assert/strict';
import { EvidenceTracker, InvestigationSession } from '../src/game/investigation.js';
import { CHAPTERS } from '../src/game/chapters.js';
import { mergeProgress } from '../src/game/progress-store.js';

test('evidence requires a confirmed, sustained centered gaze', () => {
  const tracker = new EvidenceTracker({ hold: 1.1, range: 22, previewRange: 38 });
  let now = 1000;
  let result = tracker.update({ distance: 15, visible: true, centerDistance: 0.03 }, now, 0.1);
  assert.equal(result.progress, 0);
  for (let i = 0; i < 14; i += 1) {
    now += 100;
    result = tracker.update({ distance: 15, visible: true, centerDistance: 0.03 }, now, 0.1);
  }
  assert.equal(tracker.recorded, true);
});

test('grace period preserves progress through a short camera wobble', () => {
  const tracker = new EvidenceTracker({ hold: 1.2, range: 22 });
  tracker.update({ distance: 10, visible: true, centerDistance: 0.01 }, 1000, 0.1);
  tracker.update({ distance: 10, visible: true, centerDistance: 0.01 }, 1200, 0.1);
  const before = tracker.progress;
  tracker.update({ distance: 10, visible: false, centerDistance: 1 }, 1400, 0.1);
  assert.equal(tracker.progress, before);
});

test('chapter session resumes recorded evidence without replaying it', () => {
  const session = new InvestigationSession(CHAPTERS[0], ['alloy-marker']);
  assert.equal(session.recordedCount, 1);
  assert.equal(session.active.contract.id, 'gate-axis');
});

test('progress merge preserves unlocks from both devices and newest preferences', () => {
  const merged = mergeProgress(
    { unlocked: ['trail-remembers', 'flooded-threshold'], hintMode: 'guided', updatedAt: 10 },
    { unlocked: ['trail-remembers', 'listening-ridge'], hintMode: 'expert', updatedAt: 20 },
  );
  assert.deepEqual(merged.unlocked, ['trail-remembers', 'flooded-threshold', 'listening-ridge']);
  assert.equal(merged.hintMode, 'expert');
});
