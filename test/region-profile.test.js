import test from 'node:test';
import assert from 'node:assert/strict';
import { REGION_PROFILES, regionProfile } from '../src/world/region-profile.js';

test('chapter two is a physical region, not a seed-only chapter variant', () => {
  const first = regionProfile('trail-remembers');
  const flooded = regionProfile('flooded-threshold');

  assert.notEqual(flooded.terrainSeed, first.terrainSeed);
  assert.notEqual(flooded.vegetationSeed, first.vegetationSeed);
  assert.equal(first.baseRuins, true);
  assert.equal(first.baseWater, true);
  assert.equal(flooded.baseRuins, false);
  assert.equal(flooded.baseWater, false);
  assert.ok(flooded.reliefScale <= 0.7);
  assert.ok(flooded.fogDensity < first.fogDensity);
});

test('flooded threshold has repeated visible water while preserving the centre lane', () => {
  const flooded = REGION_PROFILES['flooded-threshold'];
  assert.ok(flooded.floodPools.length >= 6);
  for (const pool of flooded.floodPools) {
    assert.ok(pool.along >= 10);
    assert.ok(pool.depth >= 0.12 && pool.depth <= 0.55);
    assert.ok(Math.abs(pool.side) - pool.across >= 0.7,
      `pool at t=${pool.t} reaches the protected centre lane`);
  }
});

test('all four chapters own distinct terrain and vegetation seeds', () => {
  const profiles = Object.values(REGION_PROFILES);
  assert.equal(profiles.length, 4);
  assert.equal(new Set(profiles.map((profile) => profile.terrainSeed)).size, 4);
  assert.equal(new Set(profiles.map((profile) => profile.vegetationSeed)).size, 4);
  assert.ok(REGION_PROFILES['listening-ridge'].reliefScale > 1.4);
  assert.equal(REGION_PROFILES['listening-ridge'].brook, false);
  assert.ok(REGION_PROFILES['source-engine'].reliefScale < 0.5);
  assert.ok(REGION_PROFILES['source-engine'].floodPools.length >= 4);
});
