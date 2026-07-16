export function assertGraphCollisionCellSize(collisionCellSize: number): void {
  if (!Number.isFinite(collisionCellSize) || collisionCellSize <= 0) {
    throw new Error('Grid cell size must be positive');
  }
}
