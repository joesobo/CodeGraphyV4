import { describe, expect, it } from 'vitest';
import type { FGNode } from '../../../../src/webview/components/graph/model/build';
import { get2dFitTransform } from '../../../../src/webview/components/graph/interactionRuntime/fitTransform';

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

describe('graph/interactionRuntime/fitTransform', () => {
  it('returns null when container size is not measurable', () => {
    expect(get2dFitTransform(null, [], 'codegraphy.connections')).toBeNull();
  });

  it('returns null when container width or height is zero', () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', {
      configurable: true,
      value: 0,
    });
    Object.defineProperty(container, 'clientHeight', {
      configurable: true,
      value: 240,
    });

    expect(
      get2dFitTransform(
        container,
        [node({ id: 'a', x: 0, y: 0, size: 10 })],
        'codegraphy.connections',
      ),
    ).toBeNull();
  });

  it('returns null when container height is zero', () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', {
      configurable: true,
      value: 240,
    });
    Object.defineProperty(container, 'clientHeight', {
      configurable: true,
      value: 0,
    });

    expect(
      get2dFitTransform(
        container,
        [node({ id: 'a', x: 0, y: 0, size: 10 })],
        'codegraphy.connections',
      ),
    ).toBeNull();
  });

  it('uses depth padding and measured graph bounds to center the view', () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(container, 'clientHeight', {
      configurable: true,
      value: 300,
    });

    expect(
      get2dFitTransform(
        container,
        [
          node({ id: 'a', x: 0, y: 0, size: 10 }),
          node({ id: 'b', x: 100, y: 100, size: 10 }),
        ],
        'codegraphy.depth-graph',
      ),
    ).toEqual({
      centerX: 50,
      centerY: 74.61538461538461,
      zoom: 1.3,
    });
  });

  it('uses the available width when it is the limiting dimension', () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', {
      configurable: true,
      value: 200,
    });
    Object.defineProperty(container, 'clientHeight', {
      configurable: true,
      value: 400,
    });

    expect(
      get2dFitTransform(
        container,
        [
          node({ id: 'a', x: 0, y: 0, size: 10 }),
          node({ id: 'b', x: 100, y: 100, size: 10 }),
        ],
        'codegraphy.connections',
      ),
    ).toEqual({
      centerX: 50,
      centerY: 50,
      zoom: 1,
    });
  });

  it('uses the default fit padding for a regular 2d view', () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(container, 'clientHeight', {
      configurable: true,
      value: 300,
    });

    expect(
      get2dFitTransform(
        container,
        [
          node({ id: 'a', x: 0, y: 0, size: 10 }),
          node({ id: 'b', x: 100, y: 100, size: 10 }),
        ],
        'codegraphy.connections',
      ),
    ).toEqual({
      centerX: 50,
      centerY: 50,
      zoom: 1.8333333333333333,
    });
  });

  it('returns null when nodes do not yield finite bounds', () => {
    const container = document.createElement('div');
    Object.defineProperty(container, 'clientWidth', {
      configurable: true,
      value: 320,
    });
    Object.defineProperty(container, 'clientHeight', {
      configurable: true,
      value: 240,
    });

    expect(
      get2dFitTransform(
        container,
        [node({ x: undefined, y: undefined })],
        'codegraphy.connections',
      ),
    ).toBeNull();
  });
});
