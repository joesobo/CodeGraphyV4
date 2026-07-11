import type { GraphInteractionHandlersDependencies } from '../../handlers';
import type { GraphView2dControls, GraphView3dControls, GraphView3dCoords } from '../../fit/api/controls';

function resolveNodePosition(node: { x?: number; y?: number; z?: number }): GraphView3dCoords {
  return { x: node.x ?? 0, y: node.y ?? 0, z: node.z ?? 0 };
}

export function panToNodeById(
  dependencies: GraphInteractionHandlersDependencies,
  nodeId: string,
): void {
  const node = dependencies.graphDataRef.current.nodes.find(candidate => candidate.id === nodeId);
  if (!node) return;
  const nodePosition = resolveNodePosition(node);

  if (dependencies.graphMode === '2d') {
    (dependencies.fg2dRef.current as GraphView2dControls | undefined)?.centerAt(
      nodePosition.x,
      nodePosition.y,
      300,
    );
    return;
  }

  const graph = dependencies.fg3dRef.current as GraphView3dControls | undefined;
  if (!graph) return;
  const camera = graph.camera().position;
  const target = graph.controls().target ?? { x: 0, y: 0, z: 0 };
  graph.cameraPosition(
    {
      x: camera.x + nodePosition.x - target.x,
      y: camera.y + nodePosition.y - target.y,
      z: camera.z + nodePosition.z - target.z,
    },
    nodePosition,
    300,
  );
}
