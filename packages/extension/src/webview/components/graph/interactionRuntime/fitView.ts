import type { GraphInteractionHandlersDependencies } from './handlers';
import {
  get2dFitTransform,
  getFitViewPadding,
  type GraphView2dControls,
  type GraphView3dControls,
} from './fit';

export function fitGraphView(dependencies: GraphInteractionHandlersDependencies): void {
  const padding = getFitViewPadding(dependencies.graphDataRef.current.nodes);

  if (dependencies.graphMode === '2d') {
    const graph2d = dependencies.fg2dRef.current as GraphView2dControls | undefined;
    const transform = get2dFitTransform(
      dependencies.containerRef.current,
      dependencies.graphDataRef.current.nodes,
      dependencies.depthMode ?? dependencies.activeViewId ?? false,
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
}
