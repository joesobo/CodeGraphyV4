import type { GraphView3dBounds, GraphView3dCoords } from '../../../../fit/api/controls';

export function getBoundsCenter(bounds: GraphView3dBounds): GraphView3dCoords {
  return {
    x: (bounds.x[0] + bounds.x[1]) / 2,
    y: (bounds.y[0] + bounds.y[1]) / 2,
    z: (bounds.z[0] + bounds.z[1]) / 2,
  };
}

export function getBoundsRadius(bounds: GraphView3dBounds): number {
  const width = bounds.x[1] - bounds.x[0];
  const height = bounds.y[1] - bounds.y[0];
  const depth = bounds.z[1] - bounds.z[0];
  return Math.max(Math.sqrt((width * width) + (height * height) + (depth * depth)) / 2, 1);
}
