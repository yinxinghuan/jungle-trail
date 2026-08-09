import test from 'node:test';
import assert from 'node:assert/strict';
import { JUMP_SPEED } from '../src/player/gait.js';

test('jump tuning produces a clear but grounded exploration hop', () => {
  const gravity = 9.81;
  const peakHeight = JUMP_SPEED ** 2 / (2 * gravity);
  const airborneTime = JUMP_SPEED * 2 / gravity;
  assert.ok(peakHeight >= 0.70 && peakHeight <= 0.74, `peak ${peakHeight.toFixed(3)} m`);
  assert.ok(airborneTime >= 0.74 && airborneTime <= 0.78, `airtime ${airborneTime.toFixed(3)} s`);
});
