import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createGraphData,
  createGraphState,
  getShellHarness,
  latestFrameCallback,
  renderGraphViewportShell,
  resetShellHarness,
} from './shellFixture';

const shellHarness = getShellHarness();

describe('graph/viewport/shell plugin viewport', () => {
  beforeEach(resetShellHarness);

  it('publishes mutable viewport controls for plugin-owned world overlays', () => {
    const graphState = createGraphState(createGraphData());
    const reheatSimulation = vi.fn();
    const resumeAnimation = vi.fn();
    graphState.renderer.fg2dRef.current = {
      reheatSimulation,
      graph2ScreenCoords: (x: number, y: number) => ({ x, y }),
      resumeAnimation,
      screen2GraphCoords: (x: number, y: number) => ({ x, y }),
      zoom: () => 1,
    } as never;
    const pluginHost = {
      getOverlays: vi.fn(),
      setGraphViewViewportState: vi.fn(),
    };

    renderGraphViewportShell({ graphState, pluginHost });
    act(() => latestFrameCallback()({} as CanvasRenderingContext2D, 1));
    const viewportState = pluginHost.setGraphViewViewportState.mock.calls.at(-1)?.[0] as {
      reheatSimulation(): void;
      resumeAnimation(): void;
      updateNode(nodeId: string, updates: Record<string, unknown>): boolean;
    };

    expect(viewportState.updateNode('src/app.ts', {
      fx: 42,
      fy: 24,
      sectionHeight: 144,
      sectionWidth: 288,
      x: 42,
      y: 24,
    })).toBe(true);
    expect(graphState.renderer.graphDataRef.current.nodes[0]).toMatchObject({
      fx: 42,
      fy: 24,
      sectionHeight: 144,
      sectionWidth: 288,
      x: 42,
      y: 24,
    });
    expect(viewportState.updateNode('missing.ts', { x: 1 })).toBe(false);

    viewportState.resumeAnimation();
    viewportState.reheatSimulation();
    expect(resumeAnimation).toHaveBeenCalledOnce();
    expect(reheatSimulation).toHaveBeenCalledOnce();
  });

  it('skips plugin viewport publication when the plugin host has no viewport consumers', () => {
    const pluginHost = {
      getOverlays: vi.fn(() => []),
      hasGraphViewViewportConsumers: vi.fn(() => false),
      setGraphViewViewportState: vi.fn(),
    };

    renderGraphViewportShell({ pluginHost });
    act(() => latestFrameCallback()({} as CanvasRenderingContext2D, 1));

    expect(pluginHost.hasGraphViewViewportConsumers).toHaveBeenCalledOnce();
    expect(pluginHost.setGraphViewViewportState).not.toHaveBeenCalled();
  });

  it('skips plugin viewport state publication when no plugin host is mounted', () => {
    const renderPluginOverlays = vi.fn();
    shellHarness.useGraphRenderingRuntime.mockReturnValue({
      containerSize: { height: 320, width: 480 },
      renderPluginOverlays,
    });

    renderGraphViewportShell();

    expect(() => latestFrameCallback()({} as CanvasRenderingContext2D, 1)).not.toThrow();
    expect(renderPluginOverlays).toHaveBeenCalledWith(expect.anything(), 1);
  });

  it('clears plugin viewport state for the current plugin host on host changes and unmount', () => {
    const firstPluginHost = {
      getOverlays: vi.fn(),
      setGraphViewViewportState: vi.fn(),
    };
    const secondPluginHost = {
      getOverlays: vi.fn(),
      setGraphViewViewportState: vi.fn(),
    };
    const rendered = renderGraphViewportShell({ pluginHost: firstPluginHost });

    rendered.rerenderShell({ pluginHost: secondPluginHost as never });
    expect(firstPluginHost.setGraphViewViewportState).toHaveBeenCalledWith(null);
    expect(secondPluginHost.setGraphViewViewportState).not.toHaveBeenCalledWith(null);

    rendered.unmount();
    expect(secondPluginHost.setGraphViewViewportState).toHaveBeenCalledWith(null);
  });

  it('unmounts without plugin viewport cleanup when no plugin host is mounted', () => {
    const { unmount } = renderGraphViewportShell();
    expect(() => unmount()).not.toThrow();
  });
});
