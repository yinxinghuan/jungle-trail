import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Trail } from '../src/world/path.js';
import {
  WALKABLE_TRAIL_CLEARANCE,
  clearsWalkableTrail,
  solidTrailClearance,
} from '../src/world/trail-safety.js';

const log = {
  type: 'log',
  a: [-3, 0, 0],
  b: [3, 0, 0],
  radius: 0.5,
};

test('rejects a fallen log whose capsule crosses the trail', () => {
  const trail = new Trail('trail-remembers');
  const p = trail.pointAt(0.55, new THREE.Vector3());
  const matrix = new THREE.Matrix4().makeTranslation(p.x, 0, p.z);
  assert.ok(solidTrailClearance(trail, log, matrix) < 0);
  assert.equal(clearsWalkableTrail(trail, log, matrix), false);
});

test('keeps visible deadfall outside the protected walking lane', () => {
  const trail = new Trail('source-engine');
  const p = trail.pointAt(0.55, new THREE.Vector3());
  const tangent = trail.tangentAt(0.55, new THREE.Vector3());
  const sideX = -tangent.z;
  const sideZ = tangent.x;
  const matrix = new THREE.Matrix4().makeTranslation(
    p.x + sideX * 5,
    0,
    p.z + sideZ * 5,
  );
  assert.ok(solidTrailClearance(trail, log, matrix) >= WALKABLE_TRAIL_CLEARANCE);
  assert.equal(clearsWalkableTrail(trail, log, matrix), true);
});

test('checks tree buttresses as well as the trunk centre', () => {
  const trail = new Trail('flooded-threshold');
  const p = trail.pointAt(0.4, new THREE.Vector3());
  const tangent = trail.tangentAt(0.4, new THREE.Vector3());
  const sideX = -tangent.z;
  const sideZ = tangent.x;
  const angle = Math.atan2(-sideZ, -sideX);
  const tree = {
    type: 'tree', radius: 0.35,
    buttresses: [{ angle, start: 0.4, end: 3.2, radius: 0.28 }],
  };
  const matrix = new THREE.Matrix4().makeTranslation(
    p.x + sideX * 3.1,
    0,
    p.z + sideZ * 3.1,
  );
  assert.ok(solidTrailClearance(trail, tree, matrix) < WALKABLE_TRAIL_CLEARANCE);
  assert.equal(clearsWalkableTrail(trail, tree, matrix), false);
});
