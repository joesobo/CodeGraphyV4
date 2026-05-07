import { describe, expect, it, vi } from 'vitest';
import {
  getMarqueeBounds,
  getMarqueeSelectedNodeIds,
  isMarqueePastThreshold,
} from '../../../../src/webview/components/graph/marqueeSelection/model';
import type { FGNode } from '../../../../src/webview/components/graph/model/build';

function node(id: string, x: number | undefined, y: number | undefined): FGNode {
  return {
    id,
    label: id,
    size: 16,
    color: '#93c5fd',
    borderColor: '#1d4ed8',
    borderWidth: 2,
    baseOpacity: 1,
    isFavorite: false,
    isPinned: false,
    x,
    y,
  } as FGNode;
}

describe('graph/marqueeSelection/model', () => {
  it('normalizes marquee bounds for any drag direction', () => {
    expect(getMarqueeBounds({ x: 140, y: 120 }, { x: 80, y: 40 })).toEqual({
      left: 80,
      top: 40,
      width: 60,
      height: 80,
    });
  });

  it('waits until the drag passes the movement threshold', () => {
    expect(isMarqueePastThreshold({ x: 10, y: 10 }, { x: 14, y: 14 }, 6)).toBe(false);
    expect(isMarqueePastThreshold({ x: 10, y: 10 }, { x: 17, y: 10 }, 6)).toBe(true);
  });

  it('selects visible graph nodes whose projected screen points are inside the marquee', () => {
    const graphToScreen = vi.fn((x: number, y: number) => ({ x: x + 10, y: y + 20 }));

    expect(getMarqueeSelectedNodeIds({
      bounds: { left: 90, top: 80, width: 80, height: 80 },
      graphToScreen,
      nodes: [
        node('inside-a.ts', 90, 70),
        node('inside-b.ts', 120, 100),
        node('outside.ts', 250, 250),
        node('missing-position.ts', undefined, 100),
      ],
    })).toEqual(['inside-a.ts', 'inside-b.ts']);
    expect(graphToScreen).toHaveBeenCalledWith(90, 70);
    expect(graphToScreen).toHaveBeenCalledWith(120, 100);
  });
});
