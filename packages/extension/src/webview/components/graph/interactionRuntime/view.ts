import type { GraphInteractionHandlersDependencies } from './handlers';
import type { FGNode } from '../model/build';

interface GraphView2dControls {
  centerAt(x: number, y: number, durationMs?: number): void;
  zoom(scale: number, durationMs?: number): void;
  zoom(): number;
  zoomToFit(durationMs?: number, padding?: number): void;
}

interface GraphView3dControls {
  zoomToFit(
    durationMs?: number,
    padding?: number,
    filter?: (candidate: unknown) => boolean,
  ): void;
}

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
  };

  const fitView = (): void => {
    if (dependencies.graphMode === '2d') {
      (dependencies.fg2dRef.current as GraphView2dControls | undefined)?.zoomToFit(300, 20);
      return;
    }

    (dependencies.fg3dRef.current as GraphView3dControls | undefined)?.zoomToFit(300, 20);
  };

  const zoom2d = (factor: number): void => {
    const forceGraph = dependencies.fg2dRef.current as GraphView2dControls | undefined;
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
