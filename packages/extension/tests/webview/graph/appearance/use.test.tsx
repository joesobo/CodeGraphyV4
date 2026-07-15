import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
  it('re-resolves concrete graph colors when VS Code sends a theme change message', () => {
    const initial = createAppearance('initial');
    const refreshed = createAppearance('refreshed');
    harness.resolveGraphAppearance
      .mockReturnValueOnce(initial)
      .mockReturnValueOnce(initial)
      .mockReturnValueOnce(refreshed);

    const { result } = renderHook(() => useGraphAppearance('dark'));

    expect(result.current).toBe(initial);

    act(() => {
      window.dispatchEvent(new MessageEvent('message', {
        data: { type: 'THEME_CHANGED', payload: { kind: 'dark' } },
      }));
    });

    expect(result.current).toBe(refreshed);
  });
});
