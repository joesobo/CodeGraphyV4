import { describe, expect, it, vi } from 'vitest';
import { buildGraphCallbackOptions } from '../../../../src/webview/components/graph/view/callbackOptions';

function createGraphState() {
  const invalidateImages = vi.fn();
  const meshesRef = { current: new Map() };
  const selectedNodeIdsRef = { current: new Set<string>() };
  const spritesRef = { current: new Map() };
  return {
    directionColorRef: { current: '#f00' },
    directionModeRef: { current: 'arrows' },
    edgeDecorationsRef: { current: {} },
    highlightedNeighborsRef: { current: new Set<string>() },
    highlightedNodeRef: { current: null },
    nodeDecorationsRef: { current: {} },
    renderCaches: {
      invalidateImages,
      meshesRef,
      spritesRef,
    },
    selection: {
      selectedNodeIdsRef,
    },
    showLabelsRef: { current: true },
    themeRef: { current: 'dark' },
  };
}

describe('graph/callbackOptions', () => {
  it('builds callback options from graph state refs', () => {
    const graphState = createGraphState();
    const pluginHost = { id: 'plugin-host' } as never;

    expect(
      buildGraphCallbackOptions({ graphState: graphState as never, pluginHost }),
    ).toEqual({
      pluginHost,
      refs: {
        directionColorRef: graphState.directionColorRef,
        directionModeRef: graphState.directionModeRef,
        edgeDecorationsRef: graphState.edgeDecorationsRef,
        highlightedNeighborsRef: graphState.highlightedNeighborsRef,
        highlightedNodeRef: graphState.highlightedNodeRef,
        meshesRef: graphState.renderCaches.meshesRef,
        nodeDecorationsRef: graphState.nodeDecorationsRef,
        selectedNodesSetRef: graphState.selection.selectedNodeIdsRef,
        showLabelsRef: graphState.showLabelsRef,
        spritesRef: graphState.renderCaches.spritesRef,
        themeRef: graphState.themeRef,
      },
      triggerImageRerender: graphState.renderCaches.invalidateImages,
    });
  });
});
