import type { GraphInteractionHandlersDependencies } from '../../handlers';
import {
  get2dFitTransform,
  getFitViewPadding,
  type GraphView2dControls,
} from './controls';

export function fitGraphView(dependencies: GraphInteractionHandlersDependencies): void {
  const padding = getFitViewPadding(dependencies.graphDataRef.current.nodes);
  const graph = dependencies.fg2dRef.current as GraphView2dControls | undefined;
  const transform = get2dFitTransform(
    dependencies.containerRef.current,
    dependencies.graphDataRef.current.nodes,
    dependencies.depthMode ?? false,
  );

  if (transform) {
    graph?.centerAt(transform.centerX, transform.centerY, 300);
    graph?.zoom(transform.zoom, 300);
    return;
  }

  graph?.zoomToFit(300, padding);
}
