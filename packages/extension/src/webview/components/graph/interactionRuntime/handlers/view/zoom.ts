import type { GraphInteractionHandlersDependencies } from '../../handlers';

const ZOOM_DURATION_MS = 150;

export function zoomGraphView(
  dependencies: GraphInteractionHandlersDependencies,
  factor: number,
): void {
  dependencies.fg2dRef.current?.zoomBy(factor, ZOOM_DURATION_MS);
}
