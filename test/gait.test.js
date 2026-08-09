import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ANALOG_DEAD_ZONE,
  ANALOG_WALK_EDGE,
  JOG_SPEED,
  WALK_SPEED,
  analogTravelSpeed,
} from '../src/player/gait.js';

test('analogue movement keeps a stable dead zone', () => {
  assert.equal(analogTravelSpeed(0), 0);
  assert.equal(analogTravelSpeed(ANALOG_DEAD_ZONE), 0);
  assert.ok(analogTravelSpeed(ANALOG_DEAD_ZONE + 0.04) > 0);
});

test('analogue movement reaches walk pace at the ring and jog pace at the rim', () => {
  assert.equal(analogTravelSpeed(ANALOG_WALK_EDGE), WALK_SPEED);
  assert.equal(analogTravelSpeed(1), JOG_SPEED);
});

test('analogue movement is continuous and monotonic', () => {
  let previous = 0;
  for (let index = 0; index <= 100; index += 1) {
    const speed = analogTravelSpeed(index / 100);
    assert.ok(speed >= previous, `${index}% should not reduce speed`);
    previous = speed;
  }
  assert.ok(analogTravelSpeed(ANALOG_WALK_EDGE - 0.001) < WALK_SPEED);
  assert.ok(analogTravelSpeed(ANALOG_WALK_EDGE + 0.001) > WALK_SPEED);
});
