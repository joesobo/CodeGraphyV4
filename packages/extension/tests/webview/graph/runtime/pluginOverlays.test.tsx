import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  PLUGIN_OVERLAY_RENDERER_ERROR,
  getPluginOverlayRegistrations,
  renderPluginOverlayRegistrations,
  usePluginOverlays,
} from '../../../../src/webview/components/graph/runtime/pluginOverlays';

function createContext(height: number, width: number): CanvasRenderingContext2D {
  return {
    canvas: { height, width },
    restore: vi.fn(),
    save: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe('usePluginOverlays', () => {
  it('returns an empty overlay list when no plugin host is available', () => {
    expect(getPluginOverlayRegistrations(undefined)).toEqual([]);
  });

  it('returns the plugin host overlay registrations when a host is available', () => {
    const overlays = [{ id: 'badge', fn: vi.fn() }];
    const pluginHost = {
      getOverlays: vi.fn(() => overlays),
    } as unknown as NonNullable<Parameters<typeof usePluginOverlays>[0]>;

    expect(getPluginOverlayRegistrations(pluginHost)).toBe(overlays);
    expect(pluginHost.getOverlays).toHaveBeenCalledOnce();
  });

  it('renders all overlay registrations with the computed canvas context', () => {
    const firstOverlay = vi.fn();
    const secondOverlay = vi.fn();
    const ctx = createContext(180, 320);

    renderPluginOverlayRegistrations({
      ctx,
      globalScale: 2.5,
      overlays: [
        { id: 'first', fn: firstOverlay },
        { id: 'second', fn: secondOverlay },
      ],
    });

    expect(firstOverlay).toHaveBeenCalledWith({
      ctx,
      globalScale: 2.5,
      height: 180,
      width: 320,
    });
    expect(secondOverlay).toHaveBeenCalledWith({
      ctx,
      globalScale: 2.5,
      height: 180,
      width: 320,
    });
    expect(ctx.save).toHaveBeenCalledTimes(2);
    expect(ctx.restore).toHaveBeenCalledTimes(2);
  });

  it('logs overlay errors and keeps processing direct registrations', () => {
    const onError = vi.fn();
    const goodOverlay = vi.fn();
    const thrownError = new Error('boom');

    const ctx = createContext(90, 120);
    renderPluginOverlayRegistrations({
      ctx,
      globalScale: 1,
      onError,
      overlays: [
        { id: 'bad', fn: ({ ctx: mutableContext }) => {
          mutableContext.globalAlpha = 0.2;
          throw thrownError;
        } },
        { id: 'good', fn: goodOverlay },
      ],
    });

    expect(onError).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(PLUGIN_OVERLAY_RENDERER_ERROR, thrownError);
    expect(goodOverlay).toHaveBeenCalledOnce();
    expect(ctx.save).toHaveBeenCalledTimes(2);
    expect(ctx.restore).toHaveBeenCalledTimes(2);
  });

  it('returns a no-op renderer when no plugin host is available', () => {
    const ctx = createContext(180, 320);

    const { result } = renderHook(() => usePluginOverlays(undefined));

    expect(() => {
      result.current(ctx, 1.5);
    }).not.toThrow();
  });

  it('does nothing when the plugin host has no overlays', () => {
    const getOverlays = vi.fn(() => []);
    const pluginHost = {
      getOverlays,
    } as unknown as NonNullable<Parameters<typeof usePluginOverlays>[0]>;
    const ctx = createContext(180, 320);

    const { result } = renderHook(() => usePluginOverlays(pluginHost));

    expect(() => {
      result.current(ctx, 2.5);
    }).not.toThrow();
    expect(getOverlays).toHaveBeenCalledOnce();
  });

  it('renders each plugin overlay with the canvas dimensions', () => {
    const overlay = vi.fn();
    const pluginHost = {
      getOverlays: () => [{ fn: overlay }],
    } as unknown as NonNullable<Parameters<typeof usePluginOverlays>[0]>;
    const ctx = createContext(180, 320);

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
    const thrownError = new Error('boom');
    const pluginHost = {
      getOverlays: () => [
        { fn: () => { throw thrownError; } },
        { fn: goodOverlay },
      ],
    } as unknown as NonNullable<Parameters<typeof usePluginOverlays>[0]>;

    const { result } = renderHook(() => usePluginOverlays(pluginHost));

    result.current(createContext(90, 120), 1);

    expect(consoleError).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith(PLUGIN_OVERLAY_RENDERER_ERROR, thrownError);
    expect(goodOverlay).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });

  it('uses the latest plugin host after rerender', () => {
    const firstOverlay = vi.fn();
    const secondOverlay = vi.fn();
    const ctx = createContext(90, 120);
    const { result, rerender } = renderHook(
      ({ pluginHost }: { pluginHost?: Parameters<typeof usePluginOverlays>[0] }) =>
        usePluginOverlays(pluginHost),
      {
        initialProps: {
          pluginHost: {
            getOverlays: () => [{ fn: firstOverlay }],
          } as unknown as NonNullable<Parameters<typeof usePluginOverlays>[0]>,
        },
      },
    );

    act(() => {
      result.current(ctx, 1);
    });

    rerender({
      pluginHost: {
        getOverlays: () => [{ fn: secondOverlay }],
      } as unknown as NonNullable<Parameters<typeof usePluginOverlays>[0]>,
    });

    act(() => {
      result.current(ctx, 2);
    });

    expect(firstOverlay).toHaveBeenCalledOnce();
    expect(secondOverlay).toHaveBeenCalledOnce();
    expect(secondOverlay).toHaveBeenCalledWith({
      ctx,
      globalScale: 2,
      height: 90,
      width: 120,
    });
  });
});
