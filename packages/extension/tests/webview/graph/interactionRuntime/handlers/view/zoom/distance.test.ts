import { describe, expect, it } from 'vitest';
import {
  get3dDirection,
  getDistance,
} from '../../../../../../../src/webview/components/graph/interactionRuntime/handlers/view/zoom/distance';

describe('graph/interactionRuntime/zoom/distance', () => {
  it('measures 3d distance across every axis', () => {
    expect(getDistance(
      { x: 0, y: 0, z: 0 },
      { x: 3, y: 4, z: 12 },
    )).toBe(13);
  });

  it('normalizes camera direction away from the target', () => {
    expect(get3dDirection(
      { x: 4, y: 6, z: 3 },
      { x: 1, y: 2, z: 3 },
      5,
    )).toEqual({ x: 0.6, y: 0.8, z: 0 });
  });
});
