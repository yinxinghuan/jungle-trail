import test from 'node:test';
import assert from 'node:assert/strict';
import { mapHeadingDegrees } from '../src/game/map-geometry.js';

const near = (actual, expected) => assert.ok(
  Math.abs(actual - expected) < 1e-9,
  `expected ${expected}°, received ${actual}°`,
);

test('map heading projects the four camera cardinal directions directly', () => {
  near(mapHeadingDegrees(0), 0);                 // north / screen up
  near(mapHeadingDegrees(Math.PI / 2), -90);     // west / screen left
  near(mapHeadingDegrees(-Math.PI / 2), 90);     // east / screen right
  near(Math.abs(mapHeadingDegrees(Math.PI)), 180); // south / screen down
});

test('turning right rotates the paper arrow clockwise by the same amount', () => {
  near(mapHeadingDegrees(-0.72), 0.72 * 180 / Math.PI);
  near(mapHeadingDegrees(0.41), -0.41 * 180 / Math.PI);
});
