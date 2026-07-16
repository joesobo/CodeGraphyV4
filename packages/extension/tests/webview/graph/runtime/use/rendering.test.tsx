import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';
import type { FGLink, FGNode } from '../../../../../src/webview/components/graph/model/build';
import { DEFAULT_GRAPH_APPEARANCE } from '../../../../../src/webview/components/graph/appearance/model';
import { useGraphRenderingRuntime } from '../../../../../src/webview/components/graph/runtime/use/rendering';

const renderingHarness = vi.hoisted(() => ({
  renderPluginOverlays: vi.fn(),
  useContainerSize: vi.fn(),
  useNodeAppearance: vi.fn(),
  usePluginOverlays: vi.fn(),
}));

vi.mock('../../../../../src/webview/components/graph/runtime/containerSize', () => ({
  useContainerSize: renderingHarness.useContainerSize,
}));

vi.mock('../../../../../src/webview/components/graph/runtime/pluginOverlays', () => ({
  usePluginOverlays: renderingHarness.usePluginOverlays,
}));

vi.mock('../../../../../src/webview/components/graph/runtime/use/indicators/nodeAppearance', () => ({
  useNodeAppearance: renderingHarness.useNodeAppearance,
}));

function createGraphData(): IGraphData {
  return { edges: [], nodes: [] };
}

describe('graph/runtime/useGraphRenderingRuntime', () => {
  beforeEach(() => {
    renderingHarness.renderPluginOverlays.mockReset();
    renderingHarness.useContainerSize.mockReset();
    renderingHarness.useNodeAppearance.mockReset();
    renderingHarness.usePluginOverlays.mockReset();
    renderingHarness.useContainerSize.mockReturnValue({ height: 360, width: 640 });
    renderingHarness.usePluginOverlays.mockReturnValue(renderingHarness.renderPluginOverlays);
  });

  it('owns container sizing, node appearance, and plugin overlays', () => {
    const containerRef = { current: document.createElement('div') };
    const dataRef = { current: createGraphData() };
    const graphDataRef = { current: { links: [] as FGLink[], nodes: [] as FGNode[] } };
    const pluginHost = { getOverlays: vi.fn() };

    const { result } = renderHook(() => useGraphRenderingRuntime({
      containerRef,
      dataRef,
      favorites: new Set(['favorite']),
      graphDataRef,
      pluginHost: pluginHost as never,
      theme: 'dark',
    }));

    expect(renderingHarness.useContainerSize).toHaveBeenCalledWith(containerRef);
    expect(renderingHarness.usePluginOverlays).toHaveBeenCalledWith(pluginHost);
    expect(renderingHarness.useNodeAppearance).toHaveBeenCalledWith({
      appearance: DEFAULT_GRAPH_APPEARANCE,
      dataRef,
      favorites: new Set(['favorite']),
      graphDataRef,
      theme: 'dark',
    });
    expect(result.current.containerSize).toEqual({ height: 360, width: 640 });

    const context = { canvas: { height: 180, width: 320 } } as CanvasRenderingContext2D;
    result.current.renderPluginOverlays(context, 2.5);
    expect(renderingHarness.renderPluginOverlays).toHaveBeenCalledWith(context, 2.5);
  });
});
