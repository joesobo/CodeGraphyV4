import type { GraphInteractionHandlersDependencies } from '../../../handlers';
import type { GraphView2dControls } from '../../../fit/api/controls';
import { ZOOM_DURATION_MS } from './constants';

export function zoom2d(
  dependencies: GraphInteractionHandlersDependencies,
  factor: number,
): void {
  const forceGraph = dependencies.fg2dRef.current as GraphView2dControls | undefined;
  if (!forceGraph) return;

  forceGraph.zoomBy(factor, ZOOM_DURATION_MS);
}
