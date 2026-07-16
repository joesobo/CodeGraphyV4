import type { IGraphData } from '../../../../../../src/shared/graph/contracts';
import { DEFAULT_GRAPH_APPEARANCE } from '../../../../../../src/webview/components/graph/appearance/model';
import {
  DEFAULT_NODE_SIZE,
  type FGNode,
} from '../../../../../../src/webview/components/graph/model/build';

export const DARK_APPEARANCE = {
  ...DEFAULT_GRAPH_APPEARANCE,
  focusBorder: '#60a5fa',
};

export const LIGHT_APPEARANCE = {
  ...DEFAULT_GRAPH_APPEARANCE,
  focusBorder: '#2563eb',
};

export function createData(nodes: IGraphData['nodes']): IGraphData {
  return {
    edges: nodes.length > 1
      ? nodes.slice(1).map(node => ({
        id: `${nodes[0].id}->${node.id}`,
        from: nodes[0].id,
        to: node.id,
        kind: 'import',
        sources: [],
      }))
      : [],
    nodes,
  };
}

export function createGraphNode(id: string, overrides: Partial<FGNode> = {}): FGNode {
  return {
    baseOpacity: 1,
    borderColor: '#000000',
    borderWidth: 0,
    color: '#000000',
    id,
    isFavorite: false,
    label: id,
    size: DEFAULT_NODE_SIZE,
    ...overrides,
  } as FGNode;
}
