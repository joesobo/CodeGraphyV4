import { describe, expect, it } from 'vitest';
import {
  TLDRAW_PHYSICS_COORDINATE_SCALE,
  toCanvasCoordinate,
  toPhysicsCoordinate,
} from './model';

describe('tldraw physics coordinate scale', () => {
  it('maps a 120-unit native node to the Extension minimum collision diameter', () => {
    expect(TLDRAW_PHYSICS_COORDINATE_SCALE).toBe(5);
    expect(toPhysicsCoordinate(120)).toBe(24);
    expect(toCanvasCoordinate(24)).toBe(120);
  });
});
