import { describe, expect, it } from 'vitest';
import type { FGNode } from '../../../../src/webview/components/graph/model/build';
import {
  get2dFitTransform,
  getFitViewPadding,
  getMeasuredSize,
} from '../../../../src/webview/components/graph/interactionRuntime/fit';

function createNode(overrides: Partial<FGNode> = {}): FGNode {
  return {
    id: 'node',
    label: 'node',
    color: '#fff',
    x: 0,
    y: 0,
    ...overrides,
  } as FGNode;
}

describe('graph/interactionRuntime/fit', () => {
  it('pads fit view by the largest finite node size', () => {
    expect(
      getFitViewPadding([
        createNode({ size: 12 }),
        createNode({ size: 44 }),
        createNode({ size: Number.NaN }),
      ]),
    ).toBe(152);
  });

  it('measures element size safely', () => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'clientWidth', {
      configurable: true,
      value: 320,
    });

    expect(getMeasuredSize(element, 'clientWidth')).toBe(320);
    expect(getMeasuredSize(null, 'clientHeight')).toBe(0);
  });

  it('computes the 2d fit transform and adds depth padding when needed', () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(container, 'clientHeight', {
      configurable: true,
      value: 300,
    });

    const transform = get2dFitTransform(
      container,
      [
        createNode({ id: 'a', x: 0, y: 0, size: 10 }),
        createNode({ id: 'b', x: 100, y: 100, size: 10 }),
      ],
      'codegraphy.depth-graph',
    );

    expect(transform).toEqual({
      centerX: 50,
      centerY: 74.61538461538461,
      zoom: 1.3,
    });
  });

  it('returns null for non-measurable containers or nodes', () => {
    expect(get2dFitTransform(null, [], 'codegraphy.connections')).toBeNull();
    expect(
      get2dFitTransform(document.createElement('div'), [{ id: 'a', label: 'a', color: '#fff' } as FGNode], 'codegraphy.connections'),
    ).toBeNull();
  });
});
