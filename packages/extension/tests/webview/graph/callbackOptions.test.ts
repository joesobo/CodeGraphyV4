import { describe, expect, it, vi } from 'vitest';
import { buildGraphCallbackOptions } from '../../../src/webview/components/graph/callbackOptions';

function createGraphState() {
  return {
    directionColorRef: { current: '#f00' },
    directionModeRef: { current: 'arrows' },
    edgeDecorationsRef: { current: {} },
    highlightedNeighborsRef: { current: new Set<string>() },
    highlightedNodeRef: { current: null },
    meshesRef: { current: new Map() },
    nodeDecorationsRef: { current: {} },
    selectedNodesSetRef: { current: new Set<string>() },
    showLabelsRef: { current: true },
    spritesRef: { current: new Map() },
    themeRef: { current: 'dark' },
    triggerImageRerender: vi.fn(),
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
        meshesRef: graphState.meshesRef,
        nodeDecorationsRef: graphState.nodeDecorationsRef,
        selectedNodesSetRef: graphState.selectedNodesSetRef,
        showLabelsRef: graphState.showLabelsRef,
        spritesRef: graphState.spritesRef,
        themeRef: graphState.themeRef,
      },
      triggerImageRerender: graphState.triggerImageRerender,
    });
  });
});
