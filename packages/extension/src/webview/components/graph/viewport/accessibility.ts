import type { FGLink, FGNode } from '../model/build';
import { ownedGraphNodeScreenRadius } from '@codegraphy-dev/graph-renderer';

export interface GraphScreenProjector {
  graph2ScreenCoords(x: number, y: number): { x: number; y: number };
  zoom(): number;
}

export interface GraphAccessibilityNodeItem {
  kind: 'node';
  id: string;
  label: string;
  radius: number;
  x: number;
  y: number;
}

export interface GraphAccessibilityEdgeItem {
  kind: 'edge';
  id: string;
  label: string;
}

export interface GraphAccessibilityItems {
  nodes: GraphAccessibilityNodeItem[];
  edges: GraphAccessibilityEdgeItem[];
}

export function createGraphAccessibilityItems(
  nodes: readonly FGNode[],
  links: readonly FGLink[],
  projector: GraphScreenProjector | undefined,
): GraphAccessibilityItems {
  if (!projector) {
    return { nodes: [], edges: [] };
  }

  return {
    nodes: nodes.flatMap(node => createNodeItem(node, projector)),
    edges: links.map(createEdgeItem),
  };
}

function createNodeItem(
  node: FGNode,
  projector: GraphScreenProjector,
): GraphAccessibilityNodeItem[] {
  if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) {
    return [];
  }

  const screenPosition = projector.graph2ScreenCoords(node.x ?? 0, node.y ?? 0);

  return [{
    kind: 'node',
    id: node.id,
    label: `Graph node ${node.id}`,
    radius: ownedGraphNodeScreenRadius(node.size, projector.zoom()),
    x: screenPosition.x,
    y: screenPosition.y,
  }];
}

function createEdgeItem(link: FGLink): GraphAccessibilityEdgeItem {
  return {
    kind: 'edge',
    id: link.id,
    label: `Graph edge ${resolveLinkEndpoint(link.source)} to ${resolveLinkEndpoint(link.target)}`,
  };
}

function resolveLinkEndpoint(endpoint: string | FGNode): string {
  return typeof endpoint === 'string' ? endpoint : endpoint.id;
}
