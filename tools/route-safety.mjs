/* Built-world route regression audit.
 *
 * Run after `npm run build`:
 *   node tools/route-safety.mjs --cpu
 *   node tools/route-safety.mjs --cpu --desktop
 *
 * The pure unit tests verify the clearance calculation. This audit verifies
 * that all four deterministic generated worlds actually apply it, using the
 * same collision registry and terrain slope rule as the player controller.
 */
import { run } from './harness.mjs';
import { finish } from './tame.mjs';

const CHAPTERS = [
  'trail-remembers',
  'flooded-threshold',
  'listening-ridge',
  'source-engine',
];

const reports = [];
const desktop = process.argv.includes('--desktop');
let failed = false;

await run({
  width: desktop ? 1280 : 390,
  height: desktop ? 720 : 844,
  hash: 'manual&tier=low',
  query: 'chapter=trail-remembers&unlock=all',
  root: new URL('../dist/', import.meta.url).pathname,
  timeout: 180_000,
}, async ({ page, url }) => {
  const origin = new URL(url).origin;

  for (const chapter of CHAPTERS) {
    const chapterUrl = `${origin}/?chapter=${chapter}&unlock=all#manual&tier=low`;
    if (chapter !== CHAPTERS[0]) {
      await page.goto(chapterUrl, { waitUntil: 'domcontentloaded', timeout: 180_000 });
      await page.waitForFunction(
        (id) => window.__game?.chapter?.id === id && window.__game?.collision?.colliders?.length,
        chapter,
        { timeout: 180_000 },
      );
    }

    const report = await page.evaluate(() => {
      const game = window.__game;
      const walker = game.walker;
      const world = game.collision;
      const padding = walker.radius + world.skin;
      const requiredSurfaceGap = game.veg.root.userData.walkableTrailClearance;
      const expectedPlayerGap = requiredSurfaceGap - padding;

      const activeAt = (collider, x, z) => {
        const feet = game.terrain.height(x, z);
        return collider.maxY > feet + (collider.stepable ? world.stepHeight : 0.035)
          && collider.minY < feet + walker.height - 0.025;
      };

      const signedClearance = (collider, x, z) => {
        if (collider.type === 0) {
          return Math.hypot(x - collider.x, z - collider.z) - collider.radius - padding;
        }
        if (collider.type === 1) {
          const sx = collider.bx - collider.ax;
          const sz = collider.bz - collider.az;
          const ll = sx * sx + sz * sz;
          const u = ll > 1e-9
            ? Math.max(0, Math.min(1,
              ((x - collider.ax) * sx + (z - collider.az) * sz) / ll))
            : 0;
          return Math.hypot(
            x - collider.ax - sx * u,
            z - collider.az - sz * u,
          ) - collider.radius - padding;
        }
        const ox = x - collider.x;
        const oz = z - collider.z;
        const lx = ox * collider.ux + oz * collider.uz;
        const lz = ox * collider.vx + oz * collider.vz;
        const dx = Math.abs(lx) - collider.halfX - padding;
        const dz = Math.abs(lz) - collider.halfZ - padding;
        return dx > 0 && dz > 0 ? Math.hypot(dx, dz) : Math.max(dx, dz);
      };

      const occupied = (x, z) => {
        const candidates = world._collect(
          x - padding, x + padding, z - padding, z + padding,
        );
        return candidates.some((collider) => activeAt(collider, x, z)
          && signedClearance(collider, x, z) < 0.02);
      };

      let minimumVegetationGap = Infinity;
      let minimumAt = 0;
      let minimumKind = '';
      const steep = [];
      const point = new window.THREE.Vector3();
      const normal = new window.THREE.Vector3();
      for (let i = 0; i <= 1000; i++) {
        const t = i / 1000;
        game.trail.pointAt(t, point);
        game.terrain.normal(point.x, point.z, normal);
        if (normal.y <= 0.78) steep.push(t);
        for (const collider of world.colliders) {
          if (collider.kind === 'stone' || !activeAt(collider, point.x, point.z)) continue;
          const gap = signedClearance(collider, point.x, point.z);
          if (gap < minimumVegetationGap) {
            minimumVegetationGap = gap;
            minimumAt = t;
            minimumKind = collider.kind;
          }
        }
      }

      /* Prove that the visible dirt corridor itself remains connected through
       * the authored ruin rubble. A layered search in trail coordinates can
       * sidestep one 28 cm lane per roughly 64 cm of forward travel, but may
       * never leave `widthAt(t)` or ignore the real collision registry. */
      const layers = 600;
      const sideStep = 0.28;
      let reachable = new Set([0]);
      let blockedAt = null;
      for (let i = 1; i <= layers; i++) {
        const t = 0.955 * i / layers;
        const centre = game.trail.pointAt(t, new window.THREE.Vector3());
        const tangent = game.trail.tangentAt(t, new window.THREE.Vector3());
        const maxSide = Math.max(0, game.trail.widthAt(t) - padding - 0.06);
        const sideCells = Math.floor(maxSide / sideStep);
        const next = new Set();
        for (let side = -sideCells; side <= sideCells; side++) {
          if (!reachable.has(side - 1) && !reachable.has(side) && !reachable.has(side + 1)) continue;
          const offset = side * sideStep;
          const x = centre.x - tangent.z * offset;
          const z = centre.z + tangent.x * offset;
          const n = game.terrain.normal(x, z, new window.THREE.Vector3());
          if (n.y <= 0.78 || occupied(x, z)) continue;
          next.add(side);
        }
        reachable = next;
        if (!reachable.size) {
          blockedAt = t;
          break;
        }
      }

      return {
        chapter: game.chapter.id,
        routeSafety: game.veg.root.userData.routeSafety,
        expectedPlayerGap,
        minimumVegetationGap,
        minimumAt,
        minimumKind,
        steepSamples: steep.length,
        dirtRouteConnected: blockedAt === null,
        blockedAt,
        colliders: world.colliders.length,
      };
    });

    reports.push(report);
    const gap = report.minimumVegetationGap;
    const pass = report.routeSafety === 'route-safety-v1'
      && gap >= report.expectedPlayerGap - 0.035
      && report.steepSamples === 0
      && report.dirtRouteConnected;
    console.log(`${pass ? 'PASS' : 'FAIL'} ${desktop ? 'desktop' : 'mobile'} ${chapter}`
      + ` gap=${gap.toFixed(3)}m required=${report.expectedPlayerGap.toFixed(3)}m`
      + ` nearest=${report.minimumKind}@${report.minimumAt.toFixed(3)}`
      + ` slopes=${report.steepSamples}`
      + ` dirtRoute=${report.dirtRouteConnected ? 'connected' : `blocked@${report.blockedAt.toFixed(3)}`}`
      + ` colliders=${report.colliders}`);
    if (!pass) failed = true;
  }
});

console.log(JSON.stringify(reports, null, 2));
finish(failed || process.exitCode ? 1 : 0);
