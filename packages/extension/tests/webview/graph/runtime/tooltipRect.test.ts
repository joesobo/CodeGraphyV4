import { describe, expect, it } from 'vitest';
import type { FGNode } from '../../../../src/webview/components/graphModel';
import { DEFAULT_NODE_SIZE } from '../../../../src/webview/components/graphModel';
import { getTooltipNodeRect } from '../../../../src/webview/components/graph/runtime/tooltipRect';

describe('getTooltipNodeRect', () => {
  it('maps graph coordinates into viewport space', () => {
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

    const rect = getTooltipNodeRect({
      containerRef: { current: container },
      fg2dRef: {
        current: {
          graph2ScreenCoords: () => ({ x: 100, y: 200 }),
          zoom: () => 2,
        } as Parameters<typeof getTooltipNodeRect>[0]['fg2dRef']['current'],
      },
    }, {
      id: 'node',
      size: 12,
      x: 1,
      y: 2,
    } as FGNode);

    expect(rect).toEqual({ x: 115, y: 230, radius: 24 });
  });

  it('returns null when the graph surface is unavailable', () => {
    const rect = getTooltipNodeRect({
      containerRef: { current: null },
      fg2dRef: { current: undefined },
    }, {
      id: 'node',
      size: DEFAULT_NODE_SIZE,
    } as FGNode);

    expect(rect).toBeNull();
  });
});
