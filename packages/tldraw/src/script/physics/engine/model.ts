import {
  createGraphLayoutEngine,
  graphNodeSizeChargeMultiplier,
  type GraphLayoutEngine,
} from '@codegraphy-dev/graph-renderer';
import { toGraphLayoutConfig, type ForceSettings } from '../../forceControls/model';
import { toPhysicsCoordinate } from '../scale/model';
import type { NodeShape, ScriptShape } from '../shape/model';

const DEFAULT_NODE_SIZE = 16;
const COLLISION_RADIUS_PADDING = 4;

function resolveEdgeEndpoints(
  edgeShapes: readonly ScriptShape[],
  indexes: ReadonlyMap<string, number>,
): Array<{ source: number; target: number }> {
  return edgeShapes.flatMap((shape): Array<{ source: number; target: number }> => {
    const source = indexes.get(String(shape.meta.codegraphyFrom));
    const target = indexes.get(String(shape.meta.codegraphyTo));
    return source === undefined || target === undefined ? [] : [{ source, target }];
  });
}

function nodeRadius(shape: NodeShape): number {
  return toPhysicsCoordinate(Math.max(shape.props.w, shape.props.h)) / 2;
}

function nodeCollisionRadius(shape: NodeShape): number {
  return nodeRadius(shape) + COLLISION_RADIUS_PADDING;
}

export function createRuntimeEngine(
  nodeShapes: readonly NodeShape[],
  edgeShapes: readonly ScriptShape[],
  forceSettings: ForceSettings,
): GraphLayoutEngine | undefined {
  if (nodeShapes.length === 0) return undefined;
  const indexes = new Map<string, number>(
    nodeShapes.map((shape, index) => [shape.meta.codegraphyEntityId, index]),
  );
  const edgeEndpoints = resolveEdgeEndpoints(edgeShapes, indexes);
  return createGraphLayoutEngine({
    nodeIds: nodeShapes.map(shape => shape.meta.codegraphyEntityId),
    initialX: Float32Array.from(
      nodeShapes,
      shape => toPhysicsCoordinate(shape.x + shape.props.w / 2),
    ),
    initialY: Float32Array.from(
      nodeShapes,
      shape => toPhysicsCoordinate(shape.y + shape.props.h / 2),
    ),
    initialVx: new Float32Array(nodeShapes.length),
    initialVy: new Float32Array(nodeShapes.length),
    chargeStrengthMultipliers: Float32Array.from(
      nodeShapes,
      shape => graphNodeSizeChargeMultiplier(nodeRadius(shape), DEFAULT_NODE_SIZE),
    ),
    radii: Float32Array.from(nodeShapes, nodeCollisionRadius),
    edgeSources: Uint32Array.from(edgeEndpoints, endpoint => endpoint.source),
    edgeTargets: Uint32Array.from(edgeEndpoints, endpoint => endpoint.target),
  }, toGraphLayoutConfig(forceSettings));
}
