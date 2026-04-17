import type { GraphInteractionHandlersDependencies } from '../../handlers';

export function updateAccessCount(
  dependencies: GraphInteractionHandlersDependencies,
  nodeId: string,
  accessCount: number,
): void {
  const node = dependencies.dataRef.current.nodes.find((candidate) => candidate.id === nodeId);
  if (node) {
    node.accessCount = accessCount;
  }
}
