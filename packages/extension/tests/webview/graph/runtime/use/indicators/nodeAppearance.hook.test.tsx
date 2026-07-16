import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FAVORITE_BORDER_COLOR } from '../../../../../../src/webview/components/graph/model/build';
import { useNodeAppearance } from '../../../../../../src/webview/components/graph/runtime/use/indicators/nodeAppearance';
import { adjustColorForLightTheme } from '../../../../../../src/webview/theme/useTheme';
import {
  createData,
  createGraphNode,
  DARK_APPEARANCE,
  LIGHT_APPEARANCE,
} from './nodeAppearance.fixture';

describe('useNodeAppearance', () => {
  it('reapplies appearance when the theme changes on rerender', () => {
    const graphNodes = [createGraphNode('root')];
    const dataRef = {
      current: createData([
        { color: '#112233', depthLevel: 0, id: 'root', label: 'Root' },
      ]),
    };
    const graphDataRef = { current: { links: [], nodes: graphNodes } };
    const favorites = new Set<string>();

    const { rerender } = renderHook(
      (theme: 'dark' | 'light') => useNodeAppearance({
        appearance: theme === 'light' ? LIGHT_APPEARANCE : DARK_APPEARANCE,
        dataRef,
        favorites,
        graphDataRef,
        theme,
      }),
      { initialProps: 'dark' },
    );

    expect(graphNodes[0]).toMatchObject({
      borderColor: '#60a5fa',
      color: '#112233',
    });

    rerender('light');

    expect(graphNodes[0]).toMatchObject({
      borderColor: '#2563eb',
      color: adjustColorForLightTheme('#112233'),
    });
  });

  it('preserves model-owned size when appearance changes', () => {
    const graphNodes = [createGraphNode('root', { size: 23 })];
    const dataRef = {
      current: createData([{ color: '#112233', id: 'root', label: 'Root' }]),
    };
    const graphDataRef = { current: { links: [], nodes: graphNodes } };

    const { rerender } = renderHook(
      ({ favorites }: { favorites: Set<string> }) => useNodeAppearance({
        dataRef,
        favorites,
        graphDataRef,
        theme: 'dark',
      }),
      { initialProps: { favorites: new Set<string>() } },
    );

    expect(graphNodes[0]).toMatchObject({
      borderColor: '#112233',
      borderWidth: 2,
      size: 23,
    });

    rerender({ favorites: new Set(['root']) });

    expect(graphNodes[0]).toMatchObject({
      borderColor: FAVORITE_BORDER_COLOR,
      borderWidth: 3,
      size: 23,
    });
  });
});
