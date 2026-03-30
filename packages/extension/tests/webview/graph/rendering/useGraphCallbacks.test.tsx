import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LinkObject, NodeObject } from 'react-force-graph-2d';
import type { FGLink, FGNode } from '../../../../src/webview/components/graph/model/build';
import {
  useGraphCallbacks,
  type UseGraphCallbacksOptions,
} from '../../../../src/webview/components/graph/rendering/useGraphCallbacks';

const renderingHarness = vi.hoisted(() => ({
  createNodeThreeObject: vi.fn(),
  getGraphArrowRelPos: vi.fn(),
  getGraphDirectionalColor: vi.fn(),
  getGraphLinkColor: vi.fn(),
  getGraphLinkParticles: vi.fn(),
  getGraphLinkWidth: vi.fn(),
  paintNodePointerArea: vi.fn(),
  renderBidirectionalLink: vi.fn(),
  renderNodeCanvas: vi.fn(),
}));

vi.mock('../../../../src/webview/components/graph/rendering/link/colors', () => ({
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

vi.mock('../../../../src/webview/components/graph/rendering/nodes/canvas3d', () => ({
  createNodeThreeObject: renderingHarness.createNodeThreeObject,
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
    renderingHarness.createNodeThreeObject.mockReset();
    renderingHarness.getGraphArrowRelPos.mockReset();
    renderingHarness.getGraphDirectionalColor.mockReset();
    renderingHarness.getGraphLinkColor.mockReset();
    renderingHarness.getGraphLinkParticles.mockReset();
    renderingHarness.getGraphLinkWidth.mockReset();
    renderingHarness.paintNodePointerArea.mockReset();
    renderingHarness.renderBidirectionalLink.mockReset();
    renderingHarness.renderNodeCanvas.mockReset();
  });

  it('delegates nodeCanvasObject to renderNodeCanvas with graph refs and plugin wiring', () => {
    const node = { id: 'node-1' } as FGNode as NodeObject;
    const ctx = { canvas: document.createElement('canvas') } as CanvasRenderingContext2D;
    const { pluginHost, refs, result, triggerImageRerender } = renderUseGraphCallbacks();

    result.current.nodeCanvasObject(node, ctx, 2.5);

    expect(renderingHarness.renderNodeCanvas).toHaveBeenCalledWith({
      highlightedNeighborsRef: refs.highlightedNeighborsRef,
      highlightedNodeRef: refs.highlightedNodeRef,
      nodeDecorationsRef: refs.nodeDecorationsRef,
      selectedNodesSetRef: refs.selectedNodesSetRef,
      showLabelsRef: refs.showLabelsRef,
      themeRef: refs.themeRef,
      pluginHost,
      triggerImageRerender,
    }, node, ctx, 2.5);
  });

  it('delegates nodePointerAreaPaint to paintNodePointerArea', () => {
    const node = { id: 'node-1' } as FGNode as NodeObject;
    const ctx = { canvas: document.createElement('canvas') } as CanvasRenderingContext2D;
    const { result } = renderUseGraphCallbacks();

    result.current.nodePointerAreaPaint(node, '#ff00aa', ctx);

    expect(renderingHarness.paintNodePointerArea).toHaveBeenCalledWith(node, '#ff00aa', ctx);
  });

  it('delegates linkCanvasObject to renderBidirectionalLink with link rendering refs', () => {
    const link = { source: 'node-1', target: 'node-2' } as FGLink as LinkObject;
    const ctx = { canvas: document.createElement('canvas') } as CanvasRenderingContext2D;
    const { refs, result } = renderUseGraphCallbacks();

    result.current.linkCanvasObject(link, ctx, 1.75);

    expect(renderingHarness.renderBidirectionalLink).toHaveBeenCalledWith({
      directionColorRef: refs.directionColorRef,
      directionModeRef: refs.directionModeRef,
      edgeDecorationsRef: refs.edgeDecorationsRef,
      highlightedNodeRef: refs.highlightedNodeRef,
      themeRef: refs.themeRef,
    }, link, ctx, 1.75);
  });

  it('delegates getLinkColor to getGraphLinkColor and returns its result', () => {
    const link = { source: 'node-1', target: 'node-2' } as FGLink as LinkObject;
    renderingHarness.getGraphLinkColor.mockReturnValue('#336699');
    const { refs, result } = renderUseGraphCallbacks();

    const color = result.current.getLinkColor(link);

    expect(color).toBe('#336699');
    expect(renderingHarness.getGraphLinkColor).toHaveBeenCalledWith({
      directionColorRef: refs.directionColorRef,
      directionModeRef: refs.directionModeRef,
      edgeDecorationsRef: refs.edgeDecorationsRef,
      highlightedNodeRef: refs.highlightedNodeRef,
      themeRef: refs.themeRef,
    }, link);
  });

  it('delegates getLinkParticles to getGraphLinkParticles and returns its result', () => {
    const link = { source: 'node-1', target: 'node-2' } as FGLink as LinkObject;
    renderingHarness.getGraphLinkParticles.mockReturnValue(4);
    const { refs, result } = renderUseGraphCallbacks();

    const particleCount = result.current.getLinkParticles(link);

    expect(particleCount).toBe(4);
    expect(renderingHarness.getGraphLinkParticles).toHaveBeenCalledWith({
      directionColorRef: refs.directionColorRef,
      directionModeRef: refs.directionModeRef,
      edgeDecorationsRef: refs.edgeDecorationsRef,
      highlightedNodeRef: refs.highlightedNodeRef,
      themeRef: refs.themeRef,
    }, link);
  });

  it('delegates getArrowRelPos to getGraphArrowRelPos and returns its result', () => {
    const link = { source: 'node-1', target: 'node-2' } as LinkObject;
    renderingHarness.getGraphArrowRelPos.mockReturnValue(0.42);
    const { result } = renderUseGraphCallbacks();

    const relPos = result.current.getArrowRelPos(link);

    expect(relPos).toBe(0.42);
    expect(renderingHarness.getGraphArrowRelPos).toHaveBeenCalledWith();
  });

  it('delegates getArrowColor to getGraphDirectionalColor and returns its result', () => {
    renderingHarness.getGraphDirectionalColor.mockReturnValue('#aabbcc');
    const { refs, result } = renderUseGraphCallbacks();

    const color = result.current.getArrowColor({} as LinkObject);

    expect(color).toBe('#aabbcc');
    expect(renderingHarness.getGraphDirectionalColor).toHaveBeenCalledWith({
      directionColorRef: refs.directionColorRef,
      directionModeRef: refs.directionModeRef,
      edgeDecorationsRef: refs.edgeDecorationsRef,
      highlightedNodeRef: refs.highlightedNodeRef,
      themeRef: refs.themeRef,
    });
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

  it('delegates nodeThreeObject to createNodeThreeObject and returns its result', () => {
    const node = { id: 'node-1' } as FGNode as NodeObject;
    const threeObject = { isThreeObject: true };
    renderingHarness.createNodeThreeObject.mockReturnValue(threeObject);
    const { refs, result } = renderUseGraphCallbacks();

    const returnedObject = result.current.nodeThreeObject(node);

    expect(returnedObject).toBe(threeObject);
    expect(renderingHarness.createNodeThreeObject).toHaveBeenCalledWith({
      meshesRef: refs.meshesRef,
      showLabelsRef: refs.showLabelsRef,
      spritesRef: refs.spritesRef,
    }, node);
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
