import type {
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from 'react';
import type { GraphViewStoreState } from '../../view/store';
import {
  createGraphAccessibilityItems,
  type GraphAccessibilityItems,
  type GraphScreenProjector,
} from '../accessibility';
import type { FGLink, FGNode } from '../../model/build';

export const MAX_GRAPH_ACCESSIBILITY_NODES = 1_000;
export const MAX_GRAPH_ACCESSIBILITY_EDGES = 1_000;

export function publishCurrentGraphAccessibilityItems({
  accessibilityDirtyRef,
  graph,
  graphMode,
  lastAccessibilitySignatureRef,
  links,
  nodes,
  setAccessibilityItems,
}: {
  accessibilityDirtyRef: MutableRefObject<boolean>;
  graph: GraphScreenProjector | undefined;
  graphMode: GraphViewStoreState['graphMode'];
  lastAccessibilitySignatureRef: MutableRefObject<string>;
  links: readonly FGLink[];
  nodes: readonly FGNode[];
  setAccessibilityItems: Dispatch<SetStateAction<GraphAccessibilityItems>>;
}): void {
  if (graphMode !== '2d' || !accessibilityDirtyRef.current) {
    return;
  }

  const accessibleNodes = nodes.slice(0, MAX_GRAPH_ACCESSIBILITY_NODES);
  const accessibleLinks = links.slice(0, MAX_GRAPH_ACCESSIBILITY_EDGES);
  if (!areGraphAccessibilityNodePositionsReady(accessibleNodes)) {
    return;
  }

  const signature = createGraphAccessibilitySignature(
    accessibleNodes,
    accessibleLinks,
    nodes.length,
    links.length,
  );
  if (signature === lastAccessibilitySignatureRef.current) {
    accessibilityDirtyRef.current = false;
    return;
  }

  lastAccessibilitySignatureRef.current = signature;
  const accessibilityItems = createGraphAccessibilityItems(
    accessibleNodes,
    accessibleLinks,
    graph,
  );
  const omittedNodeCount = nodes.length - accessibleNodes.length;
  const omittedLinkCount = links.length - accessibleLinks.length;
  const omitted = [
    omittedNodeCount > 0
      ? `${omittedNodeCount} ${omittedNodeCount === 1 ? 'node' : 'nodes'}`
      : undefined,
    omittedLinkCount > 0
      ? `${omittedLinkCount} ${omittedLinkCount === 1 ? 'edge' : 'edges'}`
      : undefined,
  ].filter((value): value is string => value !== undefined);
  setAccessibilityItems({
    ...accessibilityItems,
    ...(omitted.length > 0
      ? {
          summary: `${omitted.join(' and ')} omitted. Use search or filters to narrow the graph.`,
        }
      : {}),
  });
  accessibilityDirtyRef.current = false;
}

function createGraphAccessibilitySignature(
  nodes: readonly FGNode[],
  links: readonly FGLink[],
  totalNodeCount: number,
  totalLinkCount: number,
): string {
  const nodeSignature = nodes
    .map(node => `${node.id}:${node.size}:${Number.isFinite(node.x) && Number.isFinite(node.y) ? 'ready' : 'pending'}`)
    .join('|');
  const linkSignature = links
    .map(link => `${link.id}:${resolveLinkEndpoint(link.source)}:${resolveLinkEndpoint(link.target)}`)
    .join('|');

  return `${totalNodeCount}:${totalLinkCount}::${nodeSignature}::${linkSignature}`;
}

function resolveLinkEndpoint(endpoint: string | FGNode): string {
  return typeof endpoint === 'string' ? endpoint : endpoint.id;
}

function areGraphAccessibilityNodePositionsReady(nodes: readonly FGNode[]): boolean {
  return nodes.every(node => Number.isFinite(node.x) && Number.isFinite(node.y));
}
