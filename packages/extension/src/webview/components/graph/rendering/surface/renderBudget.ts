import type { LinkObject, NodeObject } from 'react-force-graph-2d';
import type { FGLink, FGNode } from '../../model/build';
import { MAX_DETAILED_RENDER_NODES } from '../projection/model';

export { MAX_DETAILED_RENDER_NODES } from '../projection/model';
export const MAX_POINTER_RENDER_NODES = 100_000;
export const MAX_POINTER_RENDER_EDGES = 200_000;

export interface GraphRenderBudget {
  enablePointerInteraction: boolean;
  linkVisibility(this: void, link: LinkObject): boolean;
  nodeVisibility(this: void, node: NodeObject): boolean;
}

function isOverviewNode(node: FGNode): boolean {
  return node.nodeType !== 'symbol'
    && node.nodeType !== 'variable'
    && node.symbol === undefined;
}

function resolveEndpointId(endpoint: FGLink['source']): string {
  return typeof endpoint === 'string' ? endpoint : endpoint.id;
}

export function createGraphRenderBudget(graphData: {
  links: FGLink[];
  nodes: FGNode[];
}): GraphRenderBudget {
  const detailed = graphData.nodes.length <= MAX_DETAILED_RENDER_NODES;
  const visibleNodeIds = detailed
    ? new Set(graphData.nodes.map(node => node.id))
    : new Set(
        graphData.nodes
          .filter(isOverviewNode)
          .map(node => node.id),
      );
  const nodeVisibility = (node: NodeObject): boolean =>
    visibleNodeIds.has((node as FGNode).id);
  const linkVisibility = (link: LinkObject): boolean => {
    const graphLink = link as FGLink;
    return visibleNodeIds.has(resolveEndpointId(graphLink.source))
      && visibleNodeIds.has(resolveEndpointId(graphLink.target));
  };
  const visibleEdgeCount = graphData.links.reduce(
    (count, link) => count + (linkVisibility(link) ? 1 : 0),
    0,
  );

  return {
    enablePointerInteraction:
      visibleNodeIds.size <= MAX_POINTER_RENDER_NODES
      && visibleEdgeCount <= MAX_POINTER_RENDER_EDGES,
    linkVisibility,
    nodeVisibility,
  };
}
