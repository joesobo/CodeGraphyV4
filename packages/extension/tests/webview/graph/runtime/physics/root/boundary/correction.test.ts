import { describe, expect, it } from 'vitest';
import type { BoundsRect, RectangleCollisionRect } from '../../../../../../../src/webview/components/graph/runtime/physics/model';
import { getSectionBoundaryCorrection } from '../../../../../../../src/webview/components/graph/runtime/physics/root/boundary/correction';

const SECTION: BoundsRect = {
  height: 80,
  width: 100,
  x: 10,
  y: 20,
};

function circle(centerX: number, centerY: number): RectangleCollisionRect {
  return {
    centerX,
    centerY,
    height: 40,
    width: 20,
    x: centerX - 10,
    y: centerY - 20,
  };
}

describe('getSectionBoundaryCorrection', () => {
  it('returns undefined when the circle does not overlap the section', () => {
    expect(getSectionBoundaryCorrection(circle(0, 0), SECTION)).toBeUndefined();
  });

  it('chooses the left escape when that edge is nearest', () => {
    expect(getSectionBoundaryCorrection(circle(15, 60), SECTION)).toEqual({
      axis: 'x',
      delta: -16,
    });
  });

  it('chooses the right escape when that edge is nearest', () => {
    expect(getSectionBoundaryCorrection(circle(105, 60), SECTION)).toEqual({
      axis: 'x',
      delta: 16,
    });
  });

  it('chooses the top escape when that edge is nearest', () => {
    expect(getSectionBoundaryCorrection(circle(60, 25), SECTION)).toEqual({
      axis: 'y',
      delta: -16,
    });
  });

  it('chooses the bottom escape when that edge is nearest', () => {
    expect(getSectionBoundaryCorrection(circle(60, 95), SECTION)).toEqual({
      axis: 'y',
      delta: 16,
    });
  });
});
