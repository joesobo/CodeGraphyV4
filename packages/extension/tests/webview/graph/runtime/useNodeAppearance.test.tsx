import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { IGraphData } from '../../../../src/shared/types';
import type { FGNode } from '../../../../src/webview/components/graphModel';
import { FAVORITE_BORDER_COLOR } from '../../../../src/webview/components/graphModel';
import { useNodeAppearance } from '../../../../src/webview/components/graph/runtime/useNodeAppearance';

describe('useNodeAppearance', () => {
  it('updates node colors, sizes, and favorite styling', () => {
    const graphNodes = [
      { id: 'root' },
      { id: 'favorite' },
    ] as FGNode[];

    renderHook(() => useNodeAppearance({
      dataRef: {
        current: {
          edges: [{ from: 'root', to: 'favorite' }],
          nodes: [
            { color: '#112233', depthLevel: 0, id: 'root', label: 'Root' },
            { color: '#445566', depthLevel: 2, id: 'favorite', label: 'Favorite' },
          ],
        } as IGraphData,
      },
      favorites: new Set(['favorite']),
      graphDataRef: { current: { links: [], nodes: graphNodes } },
      nodeSizeMode: 'uniform',
      theme: 'dark',
    }));

    expect(graphNodes[0].color).toBe('#112233');
    expect(graphNodes[0].borderColor).toBe('#60a5fa');
    expect(graphNodes[0].borderWidth).toBe(4);
    expect(graphNodes[0].size).toBeGreaterThan(0);

    expect(graphNodes[1].color).toBe('#445566');
    expect(graphNodes[1].isFavorite).toBe(true);
    expect(graphNodes[1].borderColor).toBe(FAVORITE_BORDER_COLOR);
    expect(graphNodes[1].borderWidth).toBe(3);
    expect(graphNodes[1].size).toBeGreaterThan(0);
  });
});
