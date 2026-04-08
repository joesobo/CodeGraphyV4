import { describe, expect, it } from 'vitest';
import type { FGNode } from '../../../../src/webview/components/graph/model/build';
import { get2dFitBounds } from '../../../../src/webview/components/graph/interactionRuntime/fitBounds';

function node(overrides: Partial<FGNode> = {}): FGNode {
  return {
    id: 'node',
    label: 'node',
    color: '#fff',
    x: 0,
    y: 0,
    ...overrides,
  } as FGNode;
}

describe('graph/interactionRuntime/fitBounds', () => {
  it('returns null when no node has measurable coordinates', () => {
    expect(get2dFitBounds([node({ x: undefined, y: undefined })])).toBeNull();
  });

  it('skips nodes with non-finite coordinates and still measures the rest', () => {
    expect(
      get2dFitBounds([
        node({ id: 'a', x: Number.POSITIVE_INFINITY, y: 0, size: 10 }),
        node({ id: 'b', x: 0, y: 0, size: undefined }),
      ]),
    ).toEqual({
      minX: -16,
      maxX: 16,
      minY: -16,
      maxY: 16,
    });
  });

  it('skips nodes with non-numeric coordinates', () => {
    expect(
      get2dFitBounds([
        node({ id: 'a', x: '10' as unknown as number, y: 0, size: 10 }),
        node({ id: 'b', x: 0, y: 0, size: 10 }),
      ]),
    ).toEqual({
      minX: -10,
      maxX: 10,
      minY: -10,
      maxY: 10,
    });
  });

  it('uses the fallback radius when a node size is not finite', () => {
    expect(
      get2dFitBounds([
        node({ id: 'a', x: 10, y: 20, size: Number.POSITIVE_INFINITY }),
      ]),
    ).toEqual({
      minX: -6,
      maxX: 26,
      minY: 4,
      maxY: 36,
    });
  });

  it('expands the graph bounds by node radius', () => {
    expect(
      get2dFitBounds([
        node({ id: 'a', x: 0, y: 0, size: 10 }),
        node({ id: 'b', x: 100, y: 100, size: 10 }),
      ]),
    ).toEqual({
      minX: -10,
      maxX: 110,
      minY: -10,
      maxY: 110,
    });
  });
});
