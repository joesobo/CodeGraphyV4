import type { GraphInteractionHandlersDependencies } from '../../handlers';
import { zoom2d } from './zoom/zoom2d';
import { zoom3d } from './zoom/zoom3d';

export function zoomGraphView(
  dependencies: GraphInteractionHandlersDependencies,
  factor: number,
): void {
  if (dependencies.graphMode === '3d') {
    zoom3d(dependencies, factor);
    return;
  }

  zoom2d(dependencies, factor);
}
