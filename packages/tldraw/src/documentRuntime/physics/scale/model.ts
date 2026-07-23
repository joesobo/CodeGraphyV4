export const TLDRAW_PHYSICS_COORDINATE_SCALE = 5;

export function toPhysicsCoordinate(canvasCoordinate: number): number {
  return canvasCoordinate / TLDRAW_PHYSICS_COORDINATE_SCALE;
}

export function toCanvasCoordinate(physicsCoordinate: number): number {
  return physicsCoordinate * TLDRAW_PHYSICS_COORDINATE_SCALE;
}
