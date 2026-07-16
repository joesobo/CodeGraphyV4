import { describe, expect, it, vi } from 'vitest';
import { buildGraphCallbackOptions } from '../../../../src/webview/components/graph/view/callbackOptions';

function createGraphState() {
  const invalidateImages = vi.fn();
  const selectedNodeIdsRef = { current: new Set<string>() };
  return {
    edgeDecorationsRef: { current: {} },
    graphAppearanceRef: { current: {} },
    highlightedNeighborsRef: { current: new Set<string>() },
    highlightedNodeRef: { current: null },
    nodeDecorationsRef: { current: {} },
    renderer: {
      containerRef: { current: null },
    },
    renderCaches: {
      invalidateImages,
    },
    selection: {
      selectedNodeIdsRef,
    },
    showLabelsRef: { current: true },
  };
}

describe('graph/callbackOptions', () => {
  it('builds callback options from graph state refs', () => {
    const graphState = createGraphState();
    const pluginHost = { id: 'plugin-host' } as never;

    expect(
      buildGraphCallbackOptions({ graphState: graphState as never, pluginHost }),
    ).toEqual({
      colorContextRef: graphState.renderer.containerRef,
      pluginHost,
      refs: {
        edgeDecorationsRef: graphState.edgeDecorationsRef,
        graphAppearanceRef: graphState.graphAppearanceRef,
        highlightedNeighborsRef: graphState.highlightedNeighborsRef,
        highlightedNodeRef: graphState.highlightedNodeRef,
        nodeDecorationsRef: graphState.nodeDecorationsRef,
        selectedNodesSetRef: graphState.selection.selectedNodeIdsRef,
        showLabelsRef: graphState.showLabelsRef,
      },
      triggerImageRerender: graphState.renderCaches.invalidateImages,
    });
  });
});
