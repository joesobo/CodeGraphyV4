import type {
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from 'react';
import {
  createGraphAccessibilityItems,
  type GraphAccessibilityItems,
  type GraphScreenProjector,
} from '../accessibility';
import type { FGLink, FGNode } from '../../model/build';

export function publishCurrentGraphAccessibilityItems({
  accessibilityDirtyRef,
  graph,
  lastAccessibilitySignatureRef,
  links,
  nodes,
  setAccessibilityItems,
}: {
  accessibilityDirtyRef: MutableRefObject<boolean>;
  graph: GraphScreenProjector | undefined;
  lastAccessibilitySignatureRef: MutableRefObject<string>;
  links: readonly FGLink[];
  nodes: readonly FGNode[];
  setAccessibilityItems: Dispatch<SetStateAction<GraphAccessibilityItems>>;
}): void {
  if (!accessibilityDirtyRef.current) {
    return;
  }

  if (!areGraphAccessibilityNodePositionsReady(nodes)) {
    return;
  }

  const signature = createGraphAccessibilitySignature(nodes, links);
  if (signature === lastAccessibilitySignatureRef.current) {
    accessibilityDirtyRef.current = false;
    return;
  }

  lastAccessibilitySignatureRef.current = signature;
  setAccessibilityItems(createGraphAccessibilityItems(nodes, links, graph));
  accessibilityDirtyRef.current = false;
}

function createGraphAccessibilitySignature(
  nodes: readonly FGNode[],
  links: readonly FGLink[],
): string {
  const nodeSignature = nodes
    .map(node => `${node.id}:${node.size}:${Number.isFinite(node.x) && Number.isFinite(node.y) ? 'ready' : 'pending'}`)
    .join('|');
  const linkSignature = links
    .map(link => `${link.id}:${resolveLinkEndpoint(link.source)}:${resolveLinkEndpoint(link.target)}`)
    .join('|');

  return `${nodeSignature}::${linkSignature}`;
}

function resolveLinkEndpoint(endpoint: string | FGNode): string {
  return typeof endpoint === 'string' ? endpoint : endpoint.id;
}

function areGraphAccessibilityNodePositionsReady(nodes: readonly FGNode[]): boolean {
  return nodes.every(node => Number.isFinite(node.x) && Number.isFinite(node.y));
}
