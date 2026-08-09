export const ROUTE_SAFETY_VERSION = 'route-safety-v1';
export const WALKABLE_TRAIL_CLEARANCE = 0.9;

function transformPoint(matrix, point) {
  const e = matrix.elements;
  return {
    x: e[0] * point[0] + e[4] * point[1] + e[8] * point[2] + e[12],
    y: e[1] * point[0] + e[5] * point[1] + e[9] * point[2] + e[13],
    z: e[2] * point[0] + e[6] * point[1] + e[10] * point[2] + e[14],
  };
}

function planScale(matrix) {
  const e = matrix.elements;
  return Math.max(Math.hypot(e[0], e[2]), Math.hypot(e[8], e[10]));
}

function segmentClearance(trail, a, b, radius, sampleStep = 0.35) {
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  const samples = Math.max(1, Math.ceil(length / sampleStep));
  let clearance = Infinity;
  const q = {};
  for (let i = 0; i <= samples; i++) {
    const u = i / samples;
    const x = a.x + (b.x - a.x) * u;
    const z = a.z + (b.z - a.z) * u;
    trail.nearest(x, z, q);
    clearance = Math.min(clearance, q.dist - radius);
  }
  return clearance;
}

/**
 * Smallest plan-space gap between one vegetation solid and the trail centre.
 * The result measures to the solid surface, before the player's own radius is
 * added by collision resolution. Unsupported decorative solids return
 * Infinity and therefore do not affect placement.
 */
export function solidTrailClearance(trail, solid, matrix) {
  if (!solid) return Infinity;
  const scale = planScale(matrix);

  if (solid.type === 'log') {
    return segmentClearance(
      trail,
      transformPoint(matrix, solid.a),
      transformPoint(matrix, solid.b),
      solid.radius * scale,
    );
  }

  if (solid.type === 'tree' || solid.type === 'palm') {
    const origin = transformPoint(matrix, [0, 0, 0]);
    const q = {};
    trail.nearest(origin.x, origin.z, q);
    let clearance = q.dist - solid.radius * scale;
    for (const buttress of solid.buttresses || []) {
      const ca = Math.cos(buttress.angle);
      const sa = Math.sin(buttress.angle);
      const a = transformPoint(matrix, [ca * buttress.start, 0, sa * buttress.start]);
      const b = transformPoint(matrix, [ca * buttress.end, 0, sa * buttress.end]);
      clearance = Math.min(clearance, segmentClearance(
        trail, a, b, buttress.radius * scale,
      ));
    }
    return clearance;
  }

  return Infinity;
}

export function clearsWalkableTrail(trail, solid, matrix,
                                    clearance = WALKABLE_TRAIL_CLEARANCE) {
  return solidTrailClearance(trail, solid, matrix) >= clearance;
}
