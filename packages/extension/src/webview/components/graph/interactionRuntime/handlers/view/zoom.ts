import type { GraphInteractionHandlersDependencies } from '../../handlers';
import { zoom2d } from './zoom/zoom2d';

export function zoomGraphView(
  dependencies: GraphInteractionHandlersDependencies,
  factor: number,
): void {
  zoom2d(dependencies, factor);
}
