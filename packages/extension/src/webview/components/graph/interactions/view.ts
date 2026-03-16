import type { GraphInteractionHandlersDependencies } from '../interactions';
import type { FGNode } from '../../graphModel';

export interface ViewHandlers {
  fitView(this: void): void;
  focusNodeById(this: void, nodeId: string): void;
  updateAccessCount(this: void, nodeId: string, accessCount: number): void;
  zoom2d(this: void, factor: number): void;
}

export function createViewHandlers(
  dependencies: GraphInteractionHandlersDependencies,
): ViewHandlers {
  const focusNodeById = (nodeId: string): void => {
    const node = dependencies.graphDataRef.current.nodes.find(
      (candidate) => candidate.id === nodeId,
    );
    if (!node) return;

    if (dependencies.graphMode === '2d') {
      dependencies.fg2dRef.current?.centerAt(node.x ?? 0, node.y ?? 0, 300);
      dependencies.fg2dRef.current?.zoom(1.5, 300);
      return;
    }

    dependencies.fg3dRef.current?.zoomToFit(
      300,
      20,
      (candidate) => (candidate as FGNode).id === nodeId,
    );
  };

  const fitView = (): void => {
    if (dependencies.graphMode === '2d') {
      dependencies.fg2dRef.current?.zoomToFit(300, 20);
      return;
    }

    dependencies.fg3dRef.current?.zoomToFit(300, 20);
  };

  const zoom2d = (factor: number): void => {
    const forceGraph = dependencies.fg2dRef.current;
    if (!forceGraph) return;

    const currentZoom = forceGraph.zoom();
    forceGraph.zoom(currentZoom * factor, 150);
  };

  const updateAccessCount = (nodeId: string, accessCount: number): void => {
    const node = dependencies.dataRef.current.nodes.find((candidate) => candidate.id === nodeId);
    if (node) {
      node.accessCount = accessCount;
    }
  };

  return {
    fitView,
    focusNodeById,
    updateAccessCount,
    zoom2d,
  };
}
