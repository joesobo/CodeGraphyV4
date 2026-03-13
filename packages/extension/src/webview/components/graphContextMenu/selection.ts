import type { GraphContextSelection } from './types';

export function makeNodeContextSelection(
  nodeId: string,
  selectedNodes: ReadonlySet<string>
): GraphContextSelection {
  if (!selectedNodes.has(nodeId)) {
    return { kind: 'node', targets: [nodeId] };
  }
  return { kind: 'node', targets: [...selectedNodes] };
}

export function makeBackgroundContextSelection(): GraphContextSelection {
  return { kind: 'background', targets: [] };
}
