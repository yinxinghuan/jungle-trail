/**
 * Convert the first-person camera yaw into the SVG rotation used by the map.
 *
 * World forward at yaw 0 is -Z. The map fixes world -Z to paper north/up,
 * while positive SVG rotation is clockwise. Projecting the actual forward
 * vector directly avoids accumulating a second, route-relative sign.
 */
export function mapHeadingDegrees(yaw) {
  const angle = Number(yaw) || 0;
  const mapX = -Math.sin(angle);
  const mapY = -Math.cos(angle);
  return Math.atan2(mapX, -mapY) * 180 / Math.PI;
}
