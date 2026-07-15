export function assertGraphCollisionScale(collisionScale: number): void {
  if (!Number.isFinite(collisionScale) || collisionScale <= 0) {
    throw new Error('Collision scale must be positive');
  }
}

export function assertGraphCollisionConfiguration(
  collisionScale: number,
  collisionCellSize: number,
): void {
  assertGraphCollisionScale(collisionScale);
  if (!Number.isFinite(collisionCellSize) || collisionCellSize <= 0) {
    throw new Error('Grid cell size must be positive');
  }
}
