import type { GraphInteractionHandlersDependencies } from '../../handlers';
import type { GraphView2dControls } from '../../fit/api/controls';

export function focusNodeById(
  dependencies: GraphInteractionHandlersDependencies,
  nodeId: string,
): void {
  const node = dependencies.graphDataRef.current.nodes.find(
    candidate => candidate.id === nodeId,
  );
  if (!node) return;

  const graph = dependencies.fg2dRef.current as GraphView2dControls | undefined;
  graph?.centerAt(node.x ?? 0, node.y ?? 0, 300);
  graph?.zoom(1.5, 300);
}
