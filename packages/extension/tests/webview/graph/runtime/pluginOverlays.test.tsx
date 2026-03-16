import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePluginOverlays } from '../../../../src/webview/components/graph/runtime/pluginOverlays';

describe('usePluginOverlays', () => {
  it('renders each plugin overlay with the canvas dimensions', () => {
    const overlay = vi.fn();
    const pluginHost = {
      getOverlays: () => [{ fn: overlay }],
    } as Parameters<typeof usePluginOverlays>[0];
    const ctx = {
      canvas: { height: 180, width: 320 },
    } as CanvasRenderingContext2D;

    const { result } = renderHook(() => usePluginOverlays(pluginHost));

    result.current(ctx, 2.5);

    expect(overlay).toHaveBeenCalledWith({
      ctx,
      globalScale: 2.5,
      height: 180,
      width: 320,
    });
  });

  it('logs overlay errors and keeps processing', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const goodOverlay = vi.fn();
    const pluginHost = {
      getOverlays: () => [
        { fn: () => { throw new Error('boom'); } },
        { fn: goodOverlay },
      ],
    } as Parameters<typeof usePluginOverlays>[0];

    const { result } = renderHook(() => usePluginOverlays(pluginHost));

    result.current({ canvas: { height: 90, width: 120 } } as CanvasRenderingContext2D, 1);

    expect(consoleError).toHaveBeenCalledOnce();
    expect(goodOverlay).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });
});
