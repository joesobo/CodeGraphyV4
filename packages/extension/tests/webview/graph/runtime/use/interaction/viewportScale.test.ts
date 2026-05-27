import { describe, expect, it, vi } from 'vitest';
import { readGraphViewportScale } from '../../../../../../src/webview/components/graph/runtime/use/interaction/viewportScale';

describe('graph/runtime/use/interaction viewport scale', () => {
  it('reads a positive finite zoom value for the 2d graph', () => {
    const graph = {
      zoom: vi.fn(() => 1.75),
    };

    expect(readGraphViewportScale('2d', graph)).toBe(1.75);
    expect(graph.zoom).toHaveBeenCalledOnce();
  });

  it('does not read the graph zoom outside 2d mode', () => {
    const graph = {
      zoom: vi.fn(() => 1.75),
    };

    expect(readGraphViewportScale('3d', graph)).toBeNull();
    expect(graph.zoom).not.toHaveBeenCalled();
  });

  it('ignores missing, non-finite, and non-positive zoom values', () => {
    expect(readGraphViewportScale('2d', undefined)).toBeNull();
    expect(readGraphViewportScale('2d', {})).toBeNull();
    expect(readGraphViewportScale('2d', { zoom: () => Number.NaN })).toBeNull();
    expect(readGraphViewportScale('2d', { zoom: () => Number.POSITIVE_INFINITY })).toBeNull();
    expect(readGraphViewportScale('2d', { zoom: () => 0 })).toBeNull();
    expect(readGraphViewportScale('2d', { zoom: () => -1 })).toBeNull();
    expect(readGraphViewportScale('2d', { zoom: () => 'wide' })).toBeNull();
  });
});
