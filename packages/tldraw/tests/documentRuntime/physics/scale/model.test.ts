import { describe, expect, it } from 'vitest';
import {
  TLDRAW_PHYSICS_COORDINATE_SCALE,
  toCanvasCoordinate,
  toPhysicsCoordinate,
} from '../../../../src/documentRuntime/physics/scale/model';

describe('tldraw physics coordinate scale', () => {
  it('maps native canvas geometry to physics coordinates', () => {
    expect(TLDRAW_PHYSICS_COORDINATE_SCALE).toBe(5);
    expect(toPhysicsCoordinate(120)).toBe(24);
    expect(toCanvasCoordinate(24)).toBe(120);
  });
});
