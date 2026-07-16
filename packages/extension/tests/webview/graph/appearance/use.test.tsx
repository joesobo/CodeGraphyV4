import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cssColorRevision,
  markCssColorsChanged,
} from '../../../../src/webview/cssColors/resolver';
import type { GraphAppearance } from '../../../../src/webview/components/graph/appearance/model';
import { useGraphAppearance } from '../../../../src/webview/components/graph/appearance/use';

const harness = vi.hoisted(() => ({
  resolveGraphAppearance: vi.fn(),
}));

vi.mock('../../../../src/webview/components/graph/appearance/model', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../src/webview/components/graph/appearance/model')>();
  return {
    ...actual,
    resolveGraphAppearance: harness.resolveGraphAppearance,
  };
});

function createAppearance(stageBackground: string): GraphAppearance {
  return {
    focusBorder: `focus-${stageBackground}`,
    labelForeground: `label-${stageBackground}`,
    labelMutedForeground: `muted-${stageBackground}`,
    linkHighlight: `link-${stageBackground}`,
    linkMuted: `link-muted-${stageBackground}`,
    nodeSelectionBorder: `node-${stageBackground}`,
    stageBackground,
    transparent: 'transparent',
  };
}

describe('graph/appearance/useGraphAppearance', () => {
  beforeEach(() => {
    harness.resolveGraphAppearance.mockReset();
  });

  it('re-resolves concrete graph colors when VS Code sends a theme change message', () => {
    const initial = createAppearance('initial');
    const refreshed = createAppearance('refreshed');
    harness.resolveGraphAppearance
      .mockReturnValueOnce(initial)
      .mockReturnValueOnce(initial)
      .mockReturnValueOnce(refreshed);

    const { result } = renderHook(() => useGraphAppearance('dark'));
    const colorRevision = cssColorRevision();

    expect(result.current).toBe(initial);

    act(() => {
      window.dispatchEvent(new MessageEvent('message', {
        data: { type: 'THEME_CHANGED', payload: { kind: 'dark' } },
      }));
    });

    expect(result.current).toBe(refreshed);
    expect(cssColorRevision()).toBe(colorRevision + 1);
  });

  it('requests a graph style refresh when a plugin stylesheet changes only plugin custom properties', () => {
    const appearance = createAppearance('unchanged-theme-tokens');
    harness.resolveGraphAppearance.mockReturnValue(appearance);

    const { result } = renderHook(() => useGraphAppearance('dark'));
    const initial = result.current;

    act(() => markCssColorsChanged());

    expect(result.current).toEqual(initial);
    expect(result.current).not.toBe(initial);
  });
});
