import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createCallbacks,
  createGraphData,
  createGraphState,
  createInteractions,
  createViewState,
  getShellHarness,
  latestFrameCallback,
  renderGraphViewportShell,
  resetShellHarness,
} from './shellFixture';

const shellHarness = getShellHarness();

describe('graph/viewport/shell wiring', () => {
  beforeEach(resetShellHarness);

  it('wires rendering runtime, viewport model, and the Viewport component', () => {
    const graphData = createGraphData();
    const graphState = createGraphState(graphData);
    graphState.renderer.fg2dRef.current = {
      graph2ScreenCoords: (x: number, y: number) => ({ x: x + 10, y: y + 20 }),
      screen2GraphCoords: (x: number, y: number) => ({ x: x - 10, y: y - 20 }),
      zoom: () => 1.75,
    } as never;
    const interactions = createInteractions();
    const callbacks = createCallbacks();
    const viewState = createViewState();
    const handleEngineStop = vi.fn();
    const pluginHost = {
      getOverlays: vi.fn(),
      setGraphViewViewportState: vi.fn(),
    };

    renderGraphViewportShell({
      callbacks, graphState, handleEngineStop, interactions, pluginHost, viewState,
    });

    expect(shellHarness.useGraphRenderingRuntime).toHaveBeenCalledWith(expect.objectContaining({
      containerRef: graphState.renderer.containerRef,
      dataRef: graphState.dataRef,
      graphDataRef: graphState.renderer.graphDataRef,
      pluginHost,
      theme: 'light',
      favorites: viewState.favorites,
    }));
    expect(shellHarness.useGraphViewportModel).toHaveBeenCalledWith(expect.objectContaining({
      graphState: {
        contextSelection: graphState.context.selection,
        graphData,
      },
      handleEngineStop,
      interactions,
      viewState,
      viewportRuntime: expect.objectContaining({ containerSize: { height: 320, width: 480 } }),
    }));
    expect(shellHarness.useGraphEventEffects).toHaveBeenCalledWith(expect.objectContaining({
      containerRef: graphState.renderer.containerRef,
      dataRef: graphState.dataRef,
      directionModeRef: graphState.directionModeRef,
      graphAppearanceRef: graphState.graphAppearanceRef,
      graphDataRef: graphState.renderer.graphDataRef,
      interactionHandlers: interactions.interactionHandlers,
      fileInfoCacheRef: graphState.renderCaches.fileInfoCacheRef,
      selectedNodes: graphState.selection.selectedNodeIds,
      setTooltipData: interactions.setTooltipData,
      showLabelsRef: graphState.showLabelsRef,
      themeRef: graphState.themeRef,
      tooltipPath: '',
    }));
    expect(shellHarness.viewport).toHaveBeenCalledWith(expect.objectContaining({
      canvasBackgroundColor: 'transparent',
      containerBackgroundColor: 'var(--cg-popover-translucent)',
      containerRef: graphState.renderer.containerRef,
      directionMode: 'arrows',
      handleContextMenu: interactions.handleContextMenu,
      handleMenuAction: interactions.handleMenuAction,
      handleMouseDownCapture: interactions.handleMouseDownCapture,
      handleMouseLeave: interactions.handleMouseLeave,
      handleMouseMoveCapture: interactions.handleMouseMoveCapture,
      handleMouseUpCapture: interactions.handleMouseUpCapture,
      menuEntries: [{ id: 'menu', kind: 'action', label: 'Menu', action: { type: 'noop' } }],
      pluginHost,
      surface2dProps: expect.objectContaining({
        fg2dRef: graphState.renderer.fg2dRef,
        getArrowColor: callbacks.getArrowColor,
        getLinkColor: callbacks.getLinkColor,
        getLinkOpacity: callbacks.getLinkOpacity,
        getParticleColor: callbacks.getParticleColor,
        onRenderFramePost: expect.any(Function),
        particleSize: 3,
        particleSpeed: 0.2,
        physicsSettings: viewState.physicsSettings,
      }),
      tooltipData: interactions.tooltipData,
    }));

    act(() => latestFrameCallback()({} as CanvasRenderingContext2D, 2));
    expect(pluginHost.setGraphViewViewportState).toHaveBeenCalledWith(expect.objectContaining({
      nodes: expect.arrayContaining([
        expect.objectContaining({
          customRuntimeState: { owner: 'plugin-a' },
          id: 'src/app.ts',
        }),
      ]),
      zoom: 1.75,
    }));
  });
});
