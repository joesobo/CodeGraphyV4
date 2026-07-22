import { describe, expect, it } from 'vitest';
import {
  NODE_COLLISION_PADDING,
  TLDRAW_PHYSICS_COORDINATE_SCALE,
  toCanvasCoordinate,
  toPhysicsCoordinate,
} from './model';

describe('tldraw physics coordinate scale', () => {
  it('maps 120-unit native nodes to 40-unit Extension physics geometry', () => {
    expect(TLDRAW_PHYSICS_COORDINATE_SCALE).toBe(3);
    expect(toPhysicsCoordinate(120)).toBe(40);
    expect(toCanvasCoordinate(40)).toBe(120);
    expect(NODE_COLLISION_PADDING).toBe(8 / 3);
  });
});
