import type { GraphInteractionHandlersDependencies } from './handlers';
import { focusNodeById } from './focus';
import { get2dFitTransform, getFitViewPadding, type GraphView2dControls, type GraphView3dControls } from './fit';
import { updateAccessCount } from './accessCount';
import { zoom2d } from './zoom';

export interface ViewHandlers {
  fitView(this: void): void;
  focusNodeById(this: void, nodeId: string): void;
  updateAccessCount(this: void, nodeId: string, accessCount: number): void;
  zoom2d(this: void, factor: number): void;
}

export function createViewHandlers(
  dependencies: GraphInteractionHandlersDependencies,
): ViewHandlers {
  const fitView = (): void => {
    const padding = getFitViewPadding(dependencies.graphDataRef.current.nodes);

    if (dependencies.graphMode === '2d') {
      const graph2d = dependencies.fg2dRef.current as GraphView2dControls | undefined;
      const transform = get2dFitTransform(
        dependencies.containerRef.current,
        dependencies.graphDataRef.current.nodes,
        dependencies.activeViewId,
      );

      if (transform) {
        graph2d?.centerAt(transform.centerX, transform.centerY, 300);
        graph2d?.zoom(transform.zoom, 300);
        return;
      }

      graph2d?.zoomToFit(300, padding);
      return;
    }

    (dependencies.fg3dRef.current as GraphView3dControls | undefined)?.zoomToFit(300, padding);
  };

  return {
    fitView,
    focusNodeById: (nodeId: string) => focusNodeById(dependencies, nodeId),
    updateAccessCount: (nodeId: string, accessCount: number) =>
      updateAccessCount(dependencies, nodeId, accessCount),
    zoom2d: (factor: number) => zoom2d(dependencies, factor),
  };
}
