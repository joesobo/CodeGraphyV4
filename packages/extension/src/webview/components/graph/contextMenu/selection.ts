import type { GraphContextSelection } from './contracts';

export function makeNodeContextSelection(
  nodeId: string,
  selectedNodes: ReadonlySet<string>,
  graphPosition?: GraphContextSelection['graphPosition'],
): GraphContextSelection {
  const withGraphPosition = (targets: string[]): GraphContextSelection => (
    graphPosition
      ? { kind: 'node', graphPosition, targets }
      : { kind: 'node', targets }
  );

  if (!selectedNodes.has(nodeId)) {
    return withGraphPosition([nodeId]);
  }
  return withGraphPosition([...selectedNodes]);
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
