import type { GraphInteractionHandlersDependencies } from '../../handlers';

export function focusNodeById(
  dependencies: GraphInteractionHandlersDependencies,
  nodeId: string,
): void {
  const node = dependencies.graphDataRef.current.nodes.find(
    candidate => candidate.id === nodeId,
  );
  if (!node) return;

  dependencies.fg2dRef.current?.centerAt(node.x ?? 0, node.y ?? 0, 300);
  dependencies.fg2dRef.current?.zoom(1.5, 300);
}
