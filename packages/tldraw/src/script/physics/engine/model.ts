import {
  createGraphLayoutEngine,
  graphNodeSizeChargeMultiplier,
  type GraphLayoutEngine,
} from '@codegraphy-dev/graph-renderer';
import { toGraphLayoutConfig, type ForceSettings } from '../../forceControls/model';
import { toPhysicsCoordinate } from '../scale/model';
import type { NodeShape, ScriptShape } from '../shape/model';

const MINIMUM_NODE_SIZE = 8;
const MAXIMUM_NODE_SIZE = 30;
const DEFAULT_NODE_SIZE = 16;
const CONNECTION_SIZE_SCALE = 3;
const COLLISION_RADIUS_PADDING = 4;
const DEFAULT_CANVAS_NODE_DIAMETER = 120;

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

function connectionNodeSizes(
  nodeCount: number,
  edgeEndpoints: readonly { source: number; target: number }[],
): Float32Array {
  const relatedIndexes: Array<Set<number>> = Array.from(
    { length: nodeCount },
    () => new Set<number>(),
  );
  for (const endpoint of edgeEndpoints) {
    relatedIndexes[endpoint.source]?.add(endpoint.target);
    relatedIndexes[endpoint.target]?.add(endpoint.source);
  }
  return Float32Array.from(relatedIndexes, related => Math.max(
    MINIMUM_NODE_SIZE,
    Math.min(CONNECTION_SIZE_SCALE * Math.sqrt(related.size + 1), MAXIMUM_NODE_SIZE),
  ));
}

function nodeCollisionRadius(shape: NodeShape, connectionSize: number): number {
  const connectionRadius = connectionSize + COLLISION_RADIUS_PADDING;
  const resizedRadius = toPhysicsCoordinate(Math.max(shape.props.w, shape.props.h)) / 2;
  return Math.max(connectionRadius, resizedRadius);
}

function nodeChargeSize(shape: NodeShape, connectionSize: number): number {
  const resizedDiameter = Math.max(shape.props.w, shape.props.h);
  const resizeScale = Math.max(1, resizedDiameter / DEFAULT_CANVAS_NODE_DIAMETER);
  return connectionSize * resizeScale;
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
  const nodeSizes = connectionNodeSizes(nodeShapes.length, edgeEndpoints);
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
      (shape, index) => graphNodeSizeChargeMultiplier(
        nodeChargeSize(shape, nodeSizes[index]),
        DEFAULT_NODE_SIZE,
      ),
    ),
    radii: Float32Array.from(
      nodeShapes,
      (shape, index) => nodeCollisionRadius(shape, nodeSizes[index]),
    ),
    edgeSources: Uint32Array.from(edgeEndpoints, endpoint => endpoint.source),
    edgeTargets: Uint32Array.from(edgeEndpoints, endpoint => endpoint.target),
  }, toGraphLayoutConfig(forceSettings));
}
