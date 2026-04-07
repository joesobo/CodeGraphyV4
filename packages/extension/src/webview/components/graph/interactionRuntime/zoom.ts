import type { GraphInteractionHandlersDependencies } from './handlers';
import type { GraphView2dControls } from './fit';

export function zoom2d(
  dependencies: GraphInteractionHandlersDependencies,
  factor: number,
): void {
  const forceGraph = dependencies.fg2dRef.current as GraphView2dControls | undefined;
  if (!forceGraph) return;

  const currentZoom = forceGraph.zoom();
  forceGraph.zoom(currentZoom * factor, 150);
}
