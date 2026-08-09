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

test('large architectural evidence declares a safe observation position', () => {
  const expected = new Set([
    'gate-axis', 'water-gap', 'reflection-notch', 'listening-axis', 'source-order',
  ]);
  const contracts = CHAPTERS.flatMap((chapter) => chapter.evidence);
  const positioned = contracts.filter((contract) => contract.viewpointAnchor);
  assert.deepEqual(new Set(positioned.map((contract) => contract.id)), expected);
  positioned.forEach((contract) => {
    assert.ok(contract.viewpointRadius >= 6);
    assert.ok(contract.positioningKey);
    assert.ok(contract.readyKey);
    assert.ok(contract.hold <= 1);
  });
});

test('every evidence contract has explicit find, focus, record, and continuation copy', () => {
  CHAPTERS.flatMap((chapter) => chapter.evidence).forEach((contract) => {
    assert.ok(contract.nearbyKey);
    assert.ok(contract.searchKey);
    assert.ok(contract.focusKey);
    assert.ok(contract.recordedKey);
  });
});

test('every evidence instruction exists in both supported languages', async () => {
  globalThis.localStorage ??= { getItem: () => null };
  globalThis.navigator ??= { language: 'en-US' };
  const { I18N_COPY } = await import('../src/i18n.js');
  const commonKeys = ['clueHowTo', 'clueRecording', 'clueContinue', 'gateContinue'];
  const contractKeys = CHAPTERS.flatMap((chapter) => chapter.evidence).flatMap((contract) => [
    contract.aheadKey,
    contract.nearbyKey,
    contract.searchKey,
    contract.focusKey,
    contract.recordedKey,
    contract.positioningKey,
    contract.readyKey,
    contract.nextKey,
  ].filter(Boolean));
  for (const locale of ['en', 'zh']) {
    for (const key of new Set([...commonKeys, ...contractKeys])) {
      assert.equal(typeof I18N_COPY[locale][key], 'string', `${locale}.${key} is missing`);
      assert.ok(I18N_COPY[locale][key].trim(), `${locale}.${key} is empty`);
    }
  }
});

test('progress merge preserves unlocks from both devices and newest preferences', () => {
  const merged = mergeProgress(
    { unlocked: ['trail-remembers', 'flooded-threshold'], hintMode: 'guided', updatedAt: 10 },
    { unlocked: ['trail-remembers', 'listening-ridge'], hintMode: 'expert', updatedAt: 20 },
  );
  assert.deepEqual(merged.unlocked, ['trail-remembers', 'flooded-threshold', 'listening-ridge']);
  assert.equal(merged.hintMode, 'expert');
});
