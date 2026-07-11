import { describe, expect, it, vi } from 'vitest';
import { readGraphViewportScale } from '../../../../../../src/webview/components/graph/runtime/use/interaction/viewportScale';

describe('graph/runtime/use/interaction viewport scale', () => {
  it('reads a positive finite zoom value for the 2d graph', () => {
    const graph = {
      zoom: vi.fn(() => 1.75),
    };

    expect(readGraphViewportScale(graph)).toBe(1.75);
    expect(graph.zoom).toHaveBeenCalledOnce();
  });


  it('ignores missing, non-finite, and non-positive zoom values', () => {
    expect(readGraphViewportScale(undefined)).toBeNull();
    expect(readGraphViewportScale({})).toBeNull();
    expect(readGraphViewportScale({ zoom: () => Number.NaN })).toBeNull();
    expect(readGraphViewportScale({ zoom: () => Number.POSITIVE_INFINITY })).toBeNull();
    expect(readGraphViewportScale({ zoom: () => 0 })).toBeNull();
    expect(readGraphViewportScale({ zoom: () => -1 })).toBeNull();
    expect(readGraphViewportScale({ zoom: () => 'wide' })).toBeNull();
  });
});
