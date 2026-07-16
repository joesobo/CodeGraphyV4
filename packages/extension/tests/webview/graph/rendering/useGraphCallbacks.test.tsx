import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FGLink, FGNode } from '../../../../src/webview/components/graph/model/build';
import {
  useGraphCallbacks,
  type UseGraphCallbacksOptions,
} from '../../../../src/webview/components/graph/rendering/useGraphCallbacks';

const renderingHarness = vi.hoisted(() => ({
  getGraphDirectionalColor: vi.fn(),
  getBaseGraphLinkOpacity: vi.fn(() => 0.3),
  getBaseGraphLinkWidth: vi.fn(() => 1),
  getGraphLinkColor: vi.fn(),
  getGraphLinkOpacity: vi.fn(),
  getGraphLinkParticles: vi.fn(),
  getGraphLinkWidth: vi.fn(),
  getNodeCanvasStyle: vi.fn(),
  renderNodeCanvasLabel: vi.fn(),
}));

vi.mock('../../../../src/webview/components/graph/rendering/link/colors/model', () => ({
  getGraphDirectionalColor: renderingHarness.getGraphDirectionalColor,
  getGraphLinkColor: renderingHarness.getGraphLinkColor,
}));

vi.mock('../../../../src/webview/components/graph/rendering/link/metrics', () => ({
  getBaseGraphLinkOpacity: renderingHarness.getBaseGraphLinkOpacity,
  getBaseGraphLinkWidth: renderingHarness.getBaseGraphLinkWidth,
  getGraphLinkOpacity: renderingHarness.getGraphLinkOpacity,
  getGraphLinkParticles: renderingHarness.getGraphLinkParticles,
  getGraphLinkWidth: renderingHarness.getGraphLinkWidth,
}));

vi.mock('../../../../src/webview/components/graph/rendering/nodes/canvas2d', () => ({
  getNodeCanvasStyle: renderingHarness.getNodeCanvasStyle,
  renderNodeCanvasLabel: renderingHarness.renderNodeCanvasLabel,
}));

function createRefs(): UseGraphCallbacksOptions['refs'] {
  return {
    edgeDecorationsRef: { current: new Map() },
    graphAppearanceRef: { current: {} },
    highlightedNeighborsRef: { current: new Set<string>(['neighbor']) },
    highlightedNodeRef: { current: 'node-1' },
    nodeDecorationsRef: { current: new Map() },
    selectedNodesSetRef: { current: new Set<string>(['node-1']) },
    showLabelsRef: { current: true },
  } as unknown as UseGraphCallbacksOptions['refs'];
}

function renderUseGraphCallbacks() {
  const refs = createRefs();
  const hook = renderHook(useGraphCallbacks, {
    initialProps: {
      colorContextRef: { current: document.createElement('div') },
      pluginHost: { name: 'plugin-host' } as never,
      refs,
      triggerImageRerender: vi.fn(),
    },
  });
  return { ...hook, refs };
}

function expectedLinkContext(refs: UseGraphCallbacksOptions['refs']) {
  return {
    edgeDecorationsRef: refs.edgeDecorationsRef,
    graphAppearanceRef: refs.graphAppearanceRef,
    highlightedNodeRef: refs.highlightedNodeRef,
  };
}

describe('graph/rendering/useGraphCallbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates edge color, opacity, particles, and width through the current refs', () => {
    const link = { source: 'node-1', target: 'node-2' } as FGLink;
    renderingHarness.getGraphLinkColor.mockReturnValue('#336699');
    renderingHarness.getGraphLinkOpacity.mockReturnValue(0.3);
    renderingHarness.getGraphLinkParticles.mockReturnValue(4);
    renderingHarness.getGraphLinkWidth.mockReturnValue(2);
    const { refs, result } = renderUseGraphCallbacks();
    const context = expectedLinkContext(refs);

    expect(result.current.getLinkColor(link)).toBe('#336699');
    expect(result.current.getLinkOpacity(link)).toBe(0.3);
    expect(result.current.getLinkParticles(link)).toBe(4);
    expect(result.current.getLinkWidth(link)).toBe(2);
    expect(renderingHarness.getGraphLinkColor).toHaveBeenCalledWith(
      expect.objectContaining(context),
      link,
    );
    const callbackContext = renderingHarness.getGraphLinkColor.mock.calls[0][0];
    expect(renderingHarness.getGraphLinkOpacity.mock.calls[0][0]).toBe(callbackContext);
    expect(renderingHarness.getGraphLinkParticles.mock.calls[0][0]).toBe(callbackContext);
    expect(renderingHarness.getGraphLinkWidth.mock.calls[0][0]).toBe(callbackContext);
  });

  it('keeps callbacks stable while reading the latest rendering context', () => {
    const initialRefs = createRefs();
    const nextRefs = createRefs();
    nextRefs.highlightedNodeRef.current = 'node-2';
    const initialProps: UseGraphCallbacksOptions = {
      colorContextRef: { current: document.createElement('div') },
      pluginHost: { name: 'initial' } as never,
      refs: initialRefs,
      triggerImageRerender: vi.fn(),
    };
    const hook = renderHook(useGraphCallbacks, { initialProps });
    const callbacks = hook.result.current;
    const node = { id: 'node-2' } as FGNode;
    renderingHarness.getNodeCanvasStyle.mockReturnValue({ shape: 'circle' });

    hook.rerender({
      colorContextRef: initialProps.colorContextRef,
      pluginHost: { name: 'next' } as never,
      refs: nextRefs,
      triggerImageRerender: vi.fn(),
    });
    callbacks.getNodeStyle?.(node);

    expect(hook.result.current).toBe(callbacks);
    expect(renderingHarness.getNodeCanvasStyle).toHaveBeenCalledWith(
      expect.objectContaining({ highlightedNodeRef: nextRefs.highlightedNodeRef }),
      node,
    );
  });

  it('advances a semantic style revision only when style inputs change', () => {
    const { refs, result, rerender } = renderUseGraphCallbacks();

    expect(result.current.getStyleRevision()).toBe(1);
    expect(result.current.getStyleRevision()).toBe(1);
    refs.showLabelsRef.current = false;
    rerender({
      colorContextRef: { current: document.createElement('div') },
      pluginHost: { name: 'new-overlay-host' } as never,
      refs,
      triggerImageRerender: vi.fn(),
    });
    expect(result.current.getStyleRevision()).toBe(1);

    refs.highlightedNodeRef.current = 'node-2';
    expect(result.current.getStyleRevision()).toBe(2);
    refs.selectedNodesSetRef.current = new Set(['node-2']);
    expect(result.current.getStyleRevision()).toBe(3);
  });

  it('keeps the base-style revision stable for transient selection and decoration changes', () => {
    const { refs, result } = renderUseGraphCallbacks();

    expect(result.current.getBaseStyleRevision()).toBe(1);
    refs.highlightedNodeRef.current = 'node-2';
    refs.selectedNodesSetRef.current = new Set(['node-2']);
    refs.nodeDecorationsRef.current = new Map([['node-2', { color: '#ff0000' }]]) as never;
    refs.edgeDecorationsRef.current = new Map([['edge-1', { opacity: 0.1 }]]) as never;

    expect(result.current.getBaseStyleRevision()).toBe(1);
  });

  it('uses the directional color for arrows and particles', () => {
    renderingHarness.getGraphDirectionalColor.mockReturnValue('#aabbcc');
    const { refs, result } = renderUseGraphCallbacks();
    const link = {} as FGLink;

    expect(result.current.getArrowColor(link)).toBe('#aabbcc');
    expect(result.current.getParticleColor(link)).toBe('#aabbcc');
    expect(renderingHarness.getGraphDirectionalColor)
      .toHaveBeenCalledWith(expect.objectContaining(expectedLinkContext(refs)));
    expect(renderingHarness.getGraphDirectionalColor.mock.calls[0][0])
      .toBe(renderingHarness.getGraphDirectionalColor.mock.calls[1][0]);
  });
});
