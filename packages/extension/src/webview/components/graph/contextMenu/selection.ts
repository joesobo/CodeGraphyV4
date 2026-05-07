import type { GraphContextSelection } from './contracts';

export function makeNodeContextSelection(
  nodeId: string,
  selectedNodes: ReadonlySet<string>
): GraphContextSelection {
  if (!selectedNodes.has(nodeId)) {
    return { kind: 'node', targets: [nodeId] };
  }
  return { kind: 'node', targets: [...selectedNodes] };
}

export function makeBackgroundContextSelection(
  graphPosition?: GraphContextSelection['graphPosition'],
): GraphContextSelection {
  return graphPosition
    ? { kind: 'background', graphPosition, targets: [] }
    : { kind: 'background', targets: [] };
}

export function makeEdgeContextSelection(
  edgeId: string,
  sourceId: string,
  targetId: string
): GraphContextSelection {
  return { kind: 'edge', edgeId, targets: [sourceId, targetId] };
}
