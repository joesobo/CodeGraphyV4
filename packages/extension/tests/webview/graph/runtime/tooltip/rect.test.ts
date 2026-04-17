import { describe, expect, it } from 'vitest';
import type { FGNode } from '../../../../../src/webview/components/graph/model/build';
import { DEFAULT_NODE_SIZE } from '../../../../../src/webview/components/graph/model/build';
import { getTooltipNodeRect } from '../../../../../src/webview/components/graph/runtime/tooltip/rect';

describe('getTooltipNodeRect', () => {
  it('maps node coordinates into viewport space', () => {
    const container = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.getBoundingClientRect = () => ({
      bottom: 0,
      height: 0,
      left: 15,
      right: 0,
      top: 30,
      width: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    container.appendChild(canvas);
    const graph2ScreenCoords = (x: number, y: number) => ({ x: x * 10, y: y * 20 });

    const rect = getTooltipNodeRect({
      containerRef: { current: container },
      fg2dRef: {
        current: {
          graph2ScreenCoords,
          zoom: () => 2,
        } as Parameters<typeof getTooltipNodeRect>[0]['fg2dRef']['current'],
      },
    }, {
      id: 'node',
      size: 12,
      x: 4,
      y: -2,
    } as FGNode);

    expect(rect).toEqual({ x: 55, y: -10, radius: 24 });
  });

  it('falls back to zero graph coordinates and the default node size', () => {
    const container = document.createElement('div');
    const canvas = document.createElement('canvas');
    canvas.getBoundingClientRect = () => ({
      bottom: 0,
      height: 0,
      left: 2,
      right: 0,
      top: 3,
      width: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    container.appendChild(canvas);

    const graph2ScreenCoords = vi.fn(() => ({ x: 11, y: 13 }));

    const rect = getTooltipNodeRect({
      containerRef: { current: container },
      fg2dRef: {
        current: {
          graph2ScreenCoords,
          zoom: () => 1.5,
        } as Parameters<typeof getTooltipNodeRect>[0]['fg2dRef']['current'],
      },
    }, {
      id: 'node',
      size: undefined,
      x: undefined,
      y: undefined,
    } as FGNode);

    expect(graph2ScreenCoords).toHaveBeenCalledWith(0, 0);
    expect(rect).toEqual({ x: 13, y: 16, radius: DEFAULT_NODE_SIZE * 1.5 });
  });

  it('returns null when the graph instance is unavailable', () => {
    const container = document.createElement('div');
    container.appendChild(document.createElement('canvas'));

    const rect = getTooltipNodeRect({
      containerRef: { current: container },
      fg2dRef: { current: undefined },
    }, {
      id: 'node',
      size: DEFAULT_NODE_SIZE,
    } as FGNode);

    expect(rect).toBeNull();
  });

  it('returns null when the graph canvas is unavailable', () => {
    const container = document.createElement('div');

    const rect = getTooltipNodeRect({
      containerRef: { current: container },
      fg2dRef: {
        current: {
          graph2ScreenCoords: () => ({ x: 0, y: 0 }),
          zoom: () => 1,
        } as Parameters<typeof getTooltipNodeRect>[0]['fg2dRef']['current'],
      },
    }, {
      id: 'node',
      size: DEFAULT_NODE_SIZE,
    } as FGNode);

    expect(rect).toBeNull();
  });
});
