export function ellipseBoundary(
  halfWidth: number,
  halfHeight: number,
  directionX: number,
  directionY: number,
): number {
  return 1 / Math.hypot(directionX / halfWidth, directionY / halfHeight);
}

export function starBoundary(
  halfWidth: number,
  halfHeight: number,
  directionX: number,
  directionY: number,
): number {
  const localX = directionX / halfWidth;
  const localY = directionY / halfHeight;
  const angle = Math.atan2(localY, localX);
  const spike = 0.5 + 0.5 * Math.cos(angle * 5);
  const radius = 0.48 + 0.52 * spike * spike;
  return radius / Math.hypot(localX, localY);
}
