import type { GraphView3dBounds, GraphView3dCoords } from '../../../fit/api/controls';
import {
  MAX_3D_DISTANCE_RADIUS_FACTOR,
  MIN_3D_DISTANCE_RADIUS_FACTOR,
} from './constants';
import { getBoundsRadius } from './bounds';

export function getDistance(from: GraphView3dCoords, to: GraphView3dCoords): number {
  const x = from.x - to.x;
  const y = from.y - to.y;
  const z = from.z - to.z;
  return Math.sqrt((x * x) + (y * y) + (z * z));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function get3dDistanceRange(
  bounds: GraphView3dBounds | undefined,
  currentDistance: number,
): { min: number; max: number } {
  const radius = bounds ? getBoundsRadius(bounds) : Math.max(currentDistance, 1);
  return {
    min: radius * MIN_3D_DISTANCE_RADIUS_FACTOR,
    max: radius * MAX_3D_DISTANCE_RADIUS_FACTOR,
  };
}

export function get3dDirection(
  cameraPosition: GraphView3dCoords,
  target: GraphView3dCoords,
  currentDistance: number,
): GraphView3dCoords {
  if (currentDistance === 0) {
    return { x: 0, y: 0, z: 1 };
  }

  return {
    x: (cameraPosition.x - target.x) / currentDistance,
    y: (cameraPosition.y - target.y) / currentDistance,
    z: (cameraPosition.z - target.z) / currentDistance,
  };
}
