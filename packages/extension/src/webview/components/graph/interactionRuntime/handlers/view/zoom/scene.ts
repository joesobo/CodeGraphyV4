import type {
  GraphView3dBounds,
  GraphView3dControls,
  GraphView3dCoords,
} from '../../../fit/api/controls';
import { getBoundsCenter, isBounds } from './bounds';
import { isCoord, toCoord } from './coords';

export function get3dTarget(
  graph: GraphView3dControls,
  bounds: GraphView3dBounds | undefined,
): GraphView3dCoords {
  const target = graph.controls().target;
  if (isCoord(target)) {
    return toCoord(target);
  }
  return bounds ? getBoundsCenter(bounds) : { x: 0, y: 0, z: 0 };
}

export function get3dBounds(graph: GraphView3dControls): GraphView3dBounds | undefined {
  const bounds = graph.getGraphBbox();
  return isBounds(bounds) ? bounds : undefined;
}
