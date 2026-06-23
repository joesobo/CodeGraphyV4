import { renderHook } from '@testing-library/react';
import type { LinkObject,NodeObject } from 'react-force-graph-2d';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FGLink,FGNode } from '../../../../src/webview/components/graph/model/build';
import {
  useGraphCallbacks,
  type UseGraphCallbacksOptions,
} from '../../../../src/webview/components/graph/rendering/useGraphCallbacks';

const renderingHarness = vi.hoisted(() => ({
  getGraphArrowRelPos: vi.fn(),
  getGraphDirectionalColor: vi.fn(),
  getGraphLinkColor: vi.fn(),
  getGraphLinkParticles: vi.fn(),
  getGraphLinkWidth: vi.fn(),
  paintNodePointerArea: vi.fn(),
  renderBidirectionalLink: vi.fn(),
  renderNodeCanvas: vi.fn(),
}));

vi.mock('../../../../src/webview/components/graph/rendering/link/colors/model', () => ({
  getGraphDirectionalColor: renderingHarness.getGraphDirectionalColor,
  getGraphLinkColor: renderingHarness.getGraphLinkColor,
}));

vi.mock('../../../../src/webview/components/graph/rendering/link/metrics', () => ({
  getGraphArrowRelPos: renderingHarness.getGraphArrowRelPos,
  getGraphLinkParticles: renderingHarness.getGraphLinkParticles,
  getGraphLinkWidth: renderingHarness.getGraphLinkWidth,
}));

vi.mock('../../../../src/webview/components/graph/rendering/bidirectional/link', () => ({
  renderBidirectionalLink: renderingHarness.renderBidirectionalLink,
}));

vi.mock('../../../../src/webview/components/graph/rendering/nodes/canvas2d', () => ({
  paintNodePointerArea: renderingHarness.paintNodePointerArea,
  renderNodeCanvas: renderingHarness.renderNodeCanvas,
}));

function createRefs(): UseGraphCallbacksOptions['refs'] {
  return {
    directionColorRef: { current: 'cycle' },
    directionModeRef: { current: 'arrows' },
    edgeDecorationsRef: { current: new Map() },
    highlightedNeighborsRef: { current: new Set<string>(['neighbor']) },
    highlightedNodeRef: { current: 'node-1' },
    meshesRef: { current: new Map() },
    nodeDecorationsRef: { current: new Map() },
    selectedNodesSetRef: { current: new Set<string>(['node-1']) },
    showLabelsRef: { current: true },
    spritesRef: { current: new Map() },
    themeRef: { current: 'dark' },
  } as unknown as UseGraphCallbacksOptions['refs'];
}

function createOptions(options: Partial<UseGraphCallbacksOptions> = {}): UseGraphCallbacksOptions {
  return {
    pluginHost: options.pluginHost ?? ({ name: 'plugin-host' } as never),
    refs: options.refs ?? createRefs(),
    triggerImageRerender: options.triggerImageRerender ?? vi.fn(),
  };
}

function renderUseGraphCallbacks(options: Partial<UseGraphCallbacksOptions> = {}) {
  const initialOptions = createOptions(options);
  const hook = renderHook(useGraphCallbacks, {
    initialProps: initialOptions,
  });

  return {
    ...hook,
    pluginHost: initialOptions.pluginHost,
    refs: initialOptions.refs,
    triggerImageRerender: initialOptions.triggerImageRerender,
  };
}

describe('graph/rendering/useGraphCallbacks', () => {

    beforeEach(() => {
      renderingHarness.getGraphArrowRelPos.mockReset();
      renderingHarness.getGraphDirectionalColor.mockReset();
      renderingHarness.getGraphLinkColor.mockReset();
      renderingHarness.getGraphLinkParticles.mockReset();
      renderingHarness.getGraphLinkWidth.mockReset();
      renderingHarness.paintNodePointerArea.mockReset();
      renderingHarness.renderBidirectionalLink.mockReset();
      renderingHarness.renderNodeCanvas.mockReset();
    });



    it('delegates getParticleColor to getGraphDirectionalColor and returns its result', () => {
      renderingHarness.getGraphDirectionalColor.mockReturnValue('#ccaa33');
      const { refs, result } = renderUseGraphCallbacks();

      const color = result.current.getParticleColor({} as LinkObject);

      expect(color).toBe('#ccaa33');
      expect(renderingHarness.getGraphDirectionalColor).toHaveBeenCalledWith({
        directionColorRef: refs.directionColorRef,
        directionModeRef: refs.directionModeRef,
        edgeDecorationsRef: refs.edgeDecorationsRef,
        highlightedNodeRef: refs.highlightedNodeRef,
        themeRef: refs.themeRef,
      });
    });



    it('delegates getLinkWidth to getGraphLinkWidth and returns its result', () => {
      const link = { source: 'node-1', target: 'node-2' } as FGLink as LinkObject;
      renderingHarness.getGraphLinkWidth.mockReturnValue(6);
      const { refs, result } = renderUseGraphCallbacks();

      const width = result.current.getLinkWidth(link);

      expect(width).toBe(6);
      expect(renderingHarness.getGraphLinkWidth).toHaveBeenCalledWith({
        directionColorRef: refs.directionColorRef,
        directionModeRef: refs.directionModeRef,
        edgeDecorationsRef: refs.edgeDecorationsRef,
        highlightedNodeRef: refs.highlightedNodeRef,
        themeRef: refs.themeRef,
      }, link);
    });



    it('keeps callback identities stable across rerenders while using the latest inputs', () => {
      const initialCallbacks = renderUseGraphCallbacks();
      const node = { id: 'node-2' } as FGNode as NodeObject;
      const link = { source: 'node-1', target: 'node-2' } as FGLink as LinkObject;
      const ctx = { canvas: document.createElement('canvas') } as CanvasRenderingContext2D;
      const nextRefs = createRefs();
      const nextPluginHost = { name: 'next-plugin-host' } as never;
      const nextTriggerImageRerender = vi.fn();
      const stableCallbacks = initialCallbacks.result.current;

      renderingHarness.getGraphLinkColor.mockReturnValue('#445566');

      initialCallbacks.rerender(createOptions({
        pluginHost: nextPluginHost,
        refs: nextRefs,
        triggerImageRerender: nextTriggerImageRerender,
      }));

      stableCallbacks.nodeCanvasObject(node, ctx, 1.5);
      stableCallbacks.getLinkColor(link);

      expect(initialCallbacks.result.current).toBe(stableCallbacks);
      expect(initialCallbacks.result.current.nodeCanvasObject).toBe(stableCallbacks.nodeCanvasObject);
      expect(initialCallbacks.result.current.getLinkColor).toBe(stableCallbacks.getLinkColor);
      expect(renderingHarness.renderNodeCanvas).toHaveBeenCalledWith({
        highlightedNeighborsRef: nextRefs.highlightedNeighborsRef,
        highlightedNodeRef: nextRefs.highlightedNodeRef,
        nodeDecorationsRef: nextRefs.nodeDecorationsRef,
        selectedNodesSetRef: nextRefs.selectedNodesSetRef,
        showLabelsRef: nextRefs.showLabelsRef,
        themeRef: nextRefs.themeRef,
        pluginHost: nextPluginHost,
        triggerImageRerender: nextTriggerImageRerender,
      }, node, ctx, 1.5);
      expect(renderingHarness.getGraphLinkColor).toHaveBeenCalledWith({
        directionColorRef: nextRefs.directionColorRef,
        directionModeRef: nextRefs.directionModeRef,
        edgeDecorationsRef: nextRefs.edgeDecorationsRef,
        highlightedNodeRef: nextRefs.highlightedNodeRef,
        themeRef: nextRefs.themeRef,
      }, link);
    });
});
