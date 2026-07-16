import type { GraphInteractionHandlersDependencies } from '../../handlers';
import { getFitViewPadding } from '../padding';
import { get2dFitTransform } from '../transform';

export function fitGraphView(dependencies: GraphInteractionHandlersDependencies): void {
  const padding = getFitViewPadding(dependencies.graphDataRef.current.nodes);
  const graph = dependencies.fg2dRef.current;
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
