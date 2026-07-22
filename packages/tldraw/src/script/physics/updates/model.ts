import type { GraphLayoutEngine } from '@codegraphy-dev/graph-renderer';
import { toCanvasCoordinate } from '../scale/model';
import type { IconShape, LabelShape, NodeShape, ScriptShape } from '../shape/model';

const LABEL_GAP = 8;

interface NodeLookups {
  indexes: ReadonlyMap<string, number>;
  shapes: ReadonlyMap<string, NodeShape>;
}

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

function appendLabelUpdates(
  updates: Array<Record<string, unknown>>,
  labelShapes: readonly LabelShape[],
  nodes: NodeLookups,
  engine: GraphLayoutEngine,
): void {
  for (const shape of labelShapes) {
    const nodeId = shape.meta.codegraphyNodeId;
    const index = nodes.indexes.get(nodeId);
    const node = nodes.shapes.get(nodeId);
    if (index === undefined || !node) continue;
    updates.push({
      id: shape.id,
      type: shape.type,
      x: toCanvasCoordinate(engine.x[index]) - shape.props.w / 2,
      y: toCanvasCoordinate(engine.y[index]) + node.props.h / 2 + LABEL_GAP,
    });
  }
}

function appendIconUpdates(
  updates: Array<Record<string, unknown>>,
  iconShapes: readonly IconShape[],
  nodes: NodeLookups,
  engine: GraphLayoutEngine,
): void {
  for (const shape of iconShapes) {
    const nodeId = shape.meta.codegraphyNodeId;
    const index = nodes.indexes.get(nodeId);
    const node = nodes.shapes.get(nodeId);
    if (index === undefined || !node) continue;
    updates.push({
      id: shape.id,
      type: shape.type,
      x: toCanvasCoordinate(engine.x[index]) - shape.props.w / 2,
      y: toCanvasCoordinate(engine.y[index]) - shape.props.h / 2,
    });
  }
}

function appendEdgeUpdates(
  updates: Array<Record<string, unknown>>,
  edgeShapes: readonly ScriptShape[],
  nodeIndexes: ReadonlyMap<string, number>,
  engine: GraphLayoutEngine,
): void {
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
  iconShapes: readonly IconShape[],
  labelShapes: readonly LabelShape[],
  engine: GraphLayoutEngine,
): Array<Record<string, unknown>> {
  const updates = createNodeUpdates(nodeShapes, engine);
  const nodes = {
    indexes: new Map(engine.nodeIds.map((entityId, index) => [entityId, index])),
    shapes: new Map(nodeShapes.map(shape => [shape.meta.codegraphyEntityId, shape])),
  } satisfies NodeLookups;
  appendEdgeUpdates(updates, edgeShapes, nodes.indexes, engine);
  appendIconUpdates(updates, iconShapes, nodes, engine);
  appendLabelUpdates(updates, labelShapes, nodes, engine);
  return updates;
}
