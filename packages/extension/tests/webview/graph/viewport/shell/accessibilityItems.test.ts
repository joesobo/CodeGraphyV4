import { describe, expect, it, vi } from 'vitest';

import type { FGLink, FGNode } from '../../../../../src/webview/components/graph/model/build';
import {
  MAX_GRAPH_ACCESSIBILITY_EDGES,
  MAX_GRAPH_ACCESSIBILITY_NODES,
  publishCurrentGraphAccessibilityItems,
} from '../../../../../src/webview/components/graph/viewport/shell/accessibilityItems';

function node(index: number): FGNode {
  return {
    id: `node-${index}`,
    label: `Node ${index}`,
    size: 8,
    color: '#fff',
    borderColor: '#000',
    borderWidth: 1,
    baseOpacity: 1,
    isFavorite: false,
    isPinned: false,
    x: index,
    y: index,
  };
}

function link(index: number): FGLink {
  return {
    id: `edge-${index}`,
    from: `node-${index}`,
    to: `node-${index + 1}`,
    source: `node-${index}`,
    target: `node-${index + 1}`,
    bidirectional: false,
  };
}

describe('viewport/shell/accessibilityItems', () => {
  it('bounds the accessibility overlay for graphs larger than the DOM budget', () => {
    const nodes = Array.from(
      { length: MAX_GRAPH_ACCESSIBILITY_NODES + 1 },
      (_, index) => node(index),
    );
    const links = Array.from(
      { length: MAX_GRAPH_ACCESSIBILITY_EDGES + 1 },
      (_, index) => link(index),
    );
    const graph2ScreenCoords = vi.fn((x: number, y: number) => ({ x, y }));
    const setAccessibilityItems = vi.fn();

    publishCurrentGraphAccessibilityItems({
      accessibilityDirtyRef: { current: true },
      graph: { graph2ScreenCoords },
      graphMode: '2d',
      lastAccessibilitySignatureRef: { current: '' },
      links,
      nodes,
      setAccessibilityItems,
    });

    expect(graph2ScreenCoords).toHaveBeenCalledTimes(MAX_GRAPH_ACCESSIBILITY_NODES);
    const accessibilityItems = setAccessibilityItems.mock.calls[0]?.[0];
    expect(accessibilityItems?.nodes).toHaveLength(MAX_GRAPH_ACCESSIBILITY_NODES);
    expect(accessibilityItems?.edges).toHaveLength(MAX_GRAPH_ACCESSIBILITY_EDGES);
    expect(accessibilityItems?.summary).toContain('1 node and 1 edge omitted');
  });
});
