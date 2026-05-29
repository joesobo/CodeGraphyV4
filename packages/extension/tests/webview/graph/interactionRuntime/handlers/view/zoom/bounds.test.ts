import { describe, expect, it } from 'vitest';
import {
  getBoundsRadius,
  isBounds,
} from '../../../../../../../src/webview/components/graph/interactionRuntime/handlers/view/zoom/bounds';

describe('graph/interactionRuntime/zoom/bounds', () => {
  it('accepts only finite two-point bounds for every 3d axis', () => {
    expect(isBounds({ x: [0, 1], y: [0, 1], z: [0, 1] })).toBe(true);
    expect(isBounds(null)).toBe(false);
    expect(isBounds('bounds')).toBe(false);
    expect(isBounds({ x: [0, 1], z: [0, 1] })).toBe(false);
    expect(isBounds({ x: [0, 1], y: [0, 1] })).toBe(false);
    expect(isBounds({ x: [0, 1], y: [0, 1, 2], z: [0, 1] })).toBe(false);
    expect(isBounds({ x: [0, 1], y: [0, 1], z: [0, 1, 2] })).toBe(false);
    expect(isBounds({ x: [0, 1], y: [0, Number.NaN], z: [0, 1] })).toBe(false);
  });

  it('measures the radius across width, height, and depth', () => {
    expect(getBoundsRadius({
      x: [10, 16],
      y: [3, 11],
      z: [2, 26],
    })).toBe(13);
  });
});
