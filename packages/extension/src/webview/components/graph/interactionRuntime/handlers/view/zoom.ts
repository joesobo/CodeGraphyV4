import type { GraphInteractionHandlersDependencies } from '../../handlers';
import type {
  GraphView2dControls,
  GraphView3dBounds,
  GraphView3dControls,
  GraphView3dCoords,
} from '../../fit/api/controls';

const ZOOM_DURATION_MS = 150;
const MIN_3D_DISTANCE_RADIUS_FACTOR = 0.25;
const MAX_3D_DISTANCE_RADIUS_FACTOR = 8;

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}

function isCoord(value: unknown): value is GraphView3dCoords {
  const candidate = value as Partial<GraphView3dCoords> | undefined;
  return (
    candidate !== undefined &&
    isFiniteNumber(candidate.x ?? Number.NaN) &&
    isFiniteNumber(candidate.y ?? Number.NaN) &&
    isFiniteNumber(candidate.z ?? Number.NaN)
  );
}

function toCoord(value: GraphView3dCoords): GraphView3dCoords {
  return { x: value.x, y: value.y, z: value.z };
}

function isBounds(value: unknown): value is GraphView3dBounds {
  const candidate = value as Partial<GraphView3dBounds> | undefined;
  return (
    Array.isArray(candidate?.x) &&
    Array.isArray(candidate?.y) &&
    Array.isArray(candidate?.z) &&
    candidate.x.length === 2 &&
    candidate.y.length === 2 &&
    candidate.z.length === 2 &&
    [...candidate.x, ...candidate.y, ...candidate.z].every(isFiniteNumber)
  );
}

function getBoundsCenter(bounds: GraphView3dBounds): GraphView3dCoords {
  return {
    x: (bounds.x[0] + bounds.x[1]) / 2,
    y: (bounds.y[0] + bounds.y[1]) / 2,
    z: (bounds.z[0] + bounds.z[1]) / 2,
  };
}

function getBoundsRadius(bounds: GraphView3dBounds): number {
  const width = bounds.x[1] - bounds.x[0];
  const height = bounds.y[1] - bounds.y[0];
  const depth = bounds.z[1] - bounds.z[0];
  return Math.max(Math.sqrt((width * width) + (height * height) + (depth * depth)) / 2, 1);
}

function getDistance(from: GraphView3dCoords, to: GraphView3dCoords): number {
  const x = from.x - to.x;
  const y = from.y - to.y;
  const z = from.z - to.z;
  return Math.sqrt((x * x) + (y * y) + (z * z));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function get3dTarget(graph: GraphView3dControls, bounds: GraphView3dBounds | undefined): GraphView3dCoords {
  const target = graph.controls().target;
  if (isCoord(target)) {
    return toCoord(target);
  }
  return bounds ? getBoundsCenter(bounds) : { x: 0, y: 0, z: 0 };
}

function get3dBounds(graph: GraphView3dControls): GraphView3dBounds | undefined {
  const bounds = graph.getGraphBbox();
  return isBounds(bounds) ? bounds : undefined;
}

function get3dDistanceRange(
  bounds: GraphView3dBounds | undefined,
  currentDistance: number,
): { min: number; max: number } {
  const radius = bounds ? getBoundsRadius(bounds) : Math.max(currentDistance, 1);
  return {
    min: radius * MIN_3D_DISTANCE_RADIUS_FACTOR,
    max: radius * MAX_3D_DISTANCE_RADIUS_FACTOR,
  };
}

function get3dDirection(
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

function zoom2d(
  dependencies: GraphInteractionHandlersDependencies,
  factor: number,
): void {
  const forceGraph = dependencies.fg2dRef.current as GraphView2dControls | undefined;
  if (!forceGraph) return;

  const currentZoom = forceGraph.zoom();
  forceGraph.zoom(currentZoom * factor, ZOOM_DURATION_MS);
}

function zoom3d(
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
