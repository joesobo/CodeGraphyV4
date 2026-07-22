import type { GraphLayoutEngine } from '@codegraphy-dev/graph-renderer';
import { toCanvasCoordinate } from '../scale/model';
import type { NodeShape, ScriptShape } from '../shape/model';

function createNodeUpdates(
  nodeShapes: readonly NodeShape[],
  engine: GraphLayoutEngine,
): Array<Record<string, unknown>> {
  return nodeShapes.map((shape, index) => ({
    id: shape.id,
    type: shape.type,
    x: toCanvasCoordinate(engine.x[index]) - shape.props.w / 2,
    y: toCanvasCoordinate(engine.y[index]) - shape.props.h / 2,
  }));
}

function appendEdgeUpdates(
  updates: Array<Record<string, unknown>>,
  edgeShapes: readonly ScriptShape[],
  engine: GraphLayoutEngine,
): void {
  const nodeIndexes = new Map<string, number>(
    engine.nodeIds.map((entityId, index) => [entityId, index]),
  );
  for (const shape of edgeShapes) {
    const source = nodeIndexes.get(String(shape.meta.codegraphyFrom));
    const target = nodeIndexes.get(String(shape.meta.codegraphyTo));
    if (source === undefined || target === undefined) continue;
    updates.push({
      id: shape.id,
      type: shape.type,
      x: toCanvasCoordinate(engine.x[source]),
      y: toCanvasCoordinate(engine.y[source]),
      props: {
        ...shape.props,
        start: { x: 0, y: 0 },
        end: {
          x: toCanvasCoordinate(engine.x[target] - engine.x[source]),
          y: toCanvasCoordinate(engine.y[target] - engine.y[source]),
        },
      },
    });
  }
}

export function createShapeUpdates(
  nodeShapes: readonly NodeShape[],
  edgeShapes: readonly ScriptShape[],
  engine: GraphLayoutEngine,
): Array<Record<string, unknown>> {
  const updates = createNodeUpdates(nodeShapes, engine);
  appendEdgeUpdates(updates, edgeShapes, engine);
  return updates;
}
