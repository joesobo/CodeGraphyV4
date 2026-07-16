import { describe, expect, it } from 'vitest';
import {
  expandMinimapBounds,
  finiteMinimapBounds,
} from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/minimap/bounds';

describe('Relationship Graph minimap bounds', () => {
  it('ignores non-finite and unpaired node positions', () => {
    expect(finiteMinimapBounds(
      Float32Array.of(-100, 100, Number.NaN, 500),
      Float32Array.of(-25, 25, 3),
    )).toEqual({ maxX: 100, maxY: 25, minX: -100, minY: -25 });
  });

  it('returns no bounds when there are no finite node positions', () => {
    expect(finiteMinimapBounds([], [])).toBeUndefined();
  });

  it('uses current bounds when there is no active history', () => {
    const current = { maxX: 15, maxY: 30, minX: -10, minY: -30 };
    expect(expandMinimapBounds(undefined, current)).toBe(current);
  });

  it('expands active bounds without contracting them', () => {
    expect(expandMinimapBounds(
      { maxX: 20, maxY: 20, minX: -20, minY: -20 },
      { maxX: 15, maxY: 30, minX: -10, minY: -30 },
    )).toEqual({ maxX: 20, maxY: 30, minX: -20, minY: -30 });
  });
});
