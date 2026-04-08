import type { GraphInteractionHandlersDependencies } from './handlers';
import type { FGNode } from '../model/build';
import type { GraphView2dControls, GraphView3dControls } from './fit';

export function focusNodeById(
  dependencies: GraphInteractionHandlersDependencies,
  nodeId: string,
): void {
  const node = dependencies.graphDataRef.current.nodes.find(
    (candidate) => candidate.id === nodeId,
  );
  if (!node) return;

  if (dependencies.graphMode === '2d') {
    const graph2d = dependencies.fg2dRef.current as GraphView2dControls | undefined;
    graph2d?.centerAt(node.x ?? 0, node.y ?? 0, 300);
    graph2d?.zoom(1.5, 300);
    return;
  }

  (dependencies.fg3dRef.current as GraphView3dControls | undefined)?.zoomToFit(
    300,
    20,
    (candidate) => (candidate as FGNode).id === nodeId,
  );
}
