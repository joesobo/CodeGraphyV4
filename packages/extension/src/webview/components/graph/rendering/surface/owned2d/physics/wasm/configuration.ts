export function assertOwnedGraphCollisionScale(collisionScale: number): void {
  if (!Number.isFinite(collisionScale) || collisionScale <= 0) {
    throw new Error('Collision scale must be positive');
  }
}

export function assertOwnedGraphCollisionConfiguration(
  collisionScale: number,
  collisionCellSize: number,
): void {
  assertOwnedGraphCollisionScale(collisionScale);
  if (!Number.isFinite(collisionCellSize) || collisionCellSize <= 0) {
    throw new Error('Grid cell size must be positive');
  }
}
