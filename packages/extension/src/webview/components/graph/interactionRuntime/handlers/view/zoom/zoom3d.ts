import type { GraphInteractionHandlersDependencies } from '../../../handlers';
import type { GraphView3dControls } from '../../../fit/api/controls';
import { ZOOM_DURATION_MS } from './constants';
import {
  clamp,
  get3dDirection,
  get3dDistanceRange,
  getDistance,
} from './distance';
import { get3dBounds, get3dTarget } from './scene';
import { toCoord } from './coords';

export function zoom3d(
  dependencies: GraphInteractionHandlersDependencies,
  factor: number,
): void {
  if (factor <= 0) return;

  const forceGraph = dependencies.fg3dRef.current as GraphView3dControls | undefined;
  if (!forceGraph) return;

  const bounds = get3dBounds(forceGraph);
  const target = get3dTarget(forceGraph, bounds);
  const cameraPosition = toCoord(forceGraph.camera().position);
  const currentDistance = getDistance(cameraPosition, target);
  const { min, max } = get3dDistanceRange(bounds, currentDistance);
  const nextDistance = clamp(currentDistance / factor, min, max);
  const direction = get3dDirection(cameraPosition, target, currentDistance);

  forceGraph.cameraPosition(
    {
      x: target.x + (direction.x * nextDistance),
      y: target.y + (direction.y * nextDistance),
      z: target.z + (direction.z * nextDistance),
    },
    target,
    ZOOM_DURATION_MS,
  );
}
