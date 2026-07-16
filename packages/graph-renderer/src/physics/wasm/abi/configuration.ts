export const MAX_GRAPH_COLLISION_SCALE = 100;

export function assertGraphCollisionScale(collisionScale: number): void {
  if (!Number.isFinite(collisionScale)
    || collisionScale <= 0
    || collisionScale > MAX_GRAPH_COLLISION_SCALE) {
    throw new Error(`Collision scale must be greater than zero and at most ${MAX_GRAPH_COLLISION_SCALE}`);
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
