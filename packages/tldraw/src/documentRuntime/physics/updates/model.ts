import type { GraphLayoutEngine } from '@codegraphy-dev/graph-renderer';
import { toCanvasCoordinate } from '../scale/model';
import {
  shapeLocalPoint,
  shapePageBounds,
  type ShapeGeometryHost,
} from '../shape/geometry';
import type { IconShape, LabelShape, NodeShape, ScriptShape } from '../shape/model';

const LABEL_GAP = 8;
const MINIMUM_VISIBLE_MOVEMENT = 0.25;

interface TrackedNode {
  index: number;
  shape: NodeShape;
}

interface TrackedEdge {
  shape: ScriptShape;
  source: number;
  target: number;
}

interface TrackedIcon {
  node: TrackedNode;
  shape: IconShape;
}

interface TrackedLabel {
  node: TrackedNode;
  shape: LabelShape;
}

export interface ShapeUpdateModel {
  edges: readonly TrackedEdge[];
  icons: readonly TrackedIcon[];
  labels: readonly TrackedLabel[];
  lastX: Float64Array;
  lastY: Float64Array;
  moved: Uint8Array;
  nodes: readonly TrackedNode[];
  synchronize: Uint8Array;
  geometryHost?: ShapeGeometryHost;
}

function nodeIndexes(engine: GraphLayoutEngine): ReadonlyMap<string, number> {
  return new Map(engine.nodeIds.map((entityId, index) => [entityId, index]));
}

function trackedNodes(
  shapes: readonly NodeShape[],
  indexes: ReadonlyMap<string, number>,
): TrackedNode[] {
  return shapes.flatMap((shape): TrackedNode[] => {
    const index = indexes.get(shape.meta.codegraphyEntityId);
    return index === undefined ? [] : [{ index, shape }];
  });
}

function trackedEdges(
  shapes: readonly ScriptShape[],
  indexes: ReadonlyMap<string, number>,
): TrackedEdge[] {
  return shapes.flatMap((shape): TrackedEdge[] => {
    const source = indexes.get(String(shape.meta.codegraphyFrom));
    const target = indexes.get(String(shape.meta.codegraphyTo));
    return source === undefined || target === undefined ? [] : [{ shape, source, target }];
  });
}

function trackedIcons(
  shapes: readonly IconShape[],
  nodes: ReadonlyMap<string, TrackedNode>,
): TrackedIcon[] {
  return shapes.flatMap((shape): TrackedIcon[] => {
    const node = nodes.get(shape.meta.codegraphyNodeId);
    return node ? [{ node, shape }] : [];
  });
}

function trackedLabels(
  shapes: readonly LabelShape[],
  nodes: ReadonlyMap<string, TrackedNode>,
): TrackedLabel[] {
  return shapes.flatMap((shape): TrackedLabel[] => {
    const node = nodes.get(shape.meta.codegraphyNodeId);
    return node ? [{ node, shape }] : [];
  });
}

export function createShapeUpdateModel(
  nodeShapes: readonly NodeShape[],
  edgeShapes: readonly ScriptShape[],
  iconShapes: readonly IconShape[],
  labelShapes: readonly LabelShape[],
  engine: GraphLayoutEngine,
  geometryHost?: ShapeGeometryHost,
): ShapeUpdateModel {
  const indexes = nodeIndexes(engine);
  const nodes = trackedNodes(nodeShapes, indexes);
  const nodesByEntityId = new Map<string, TrackedNode>(
    nodes.map(node => [node.shape.meta.codegraphyEntityId, node]),
  );
  const icons: TrackedIcon[] = trackedIcons(iconShapes, nodesByEntityId);
  const labels: TrackedLabel[] = trackedLabels(labelShapes, nodesByEntityId);
  const companionParentMismatches = new Set<string>();
  for (const icon of icons) {
    if (icon.shape.parentId !== icon.node.shape.parentId) {
      companionParentMismatches.add(icon.node.shape.meta.codegraphyEntityId);
    }
  }
  for (const label of labels) {
    if (label.shape.parentId !== label.node.shape.parentId) {
      companionParentMismatches.add(label.node.shape.meta.codegraphyEntityId);
    }
  }
  const lastX = new Float64Array(engine.nodeIds.length);
  const lastY = new Float64Array(engine.nodeIds.length);
  const synchronize = new Uint8Array(engine.nodeIds.length);
  for (const node of nodes) {
    const bounds = shapePageBounds(node.shape, geometryHost);
    lastX[node.index] = bounds.x + bounds.w / 2;
    lastY[node.index] = bounds.y + bounds.h / 2;
    if (companionParentMismatches.has(node.shape.meta.codegraphyEntityId)) {
      synchronize[node.index] = 1;
    }
  }
  return {
    edges: trackedEdges(edgeShapes, indexes),
    icons,
    labels,
    lastX,
    lastY,
    moved: new Uint8Array(engine.nodeIds.length),
    nodes,
    synchronize,
    geometryHost,
  };
}

function recordVisibleMovement(
  model: ShapeUpdateModel,
  engine: GraphLayoutEngine,
): void {
  model.moved.fill(0);
  for (const node of model.nodes) {
    const x = toCanvasCoordinate(engine.x[node.index]);
    const y = toCanvasCoordinate(engine.y[node.index]);
    const synchronize = model.synchronize[node.index] === 1;
    model.synchronize[node.index] = 0;
    if (
      !synchronize
      &&
      Math.abs(x - model.lastX[node.index]) <= MINIMUM_VISIBLE_MOVEMENT
      && Math.abs(y - model.lastY[node.index]) <= MINIMUM_VISIBLE_MOVEMENT
    ) {
      continue;
    }
    model.lastX[node.index] = x;
    model.lastY[node.index] = y;
    model.moved[node.index] = 1;
  }
}

function appendNodeUpdates(
  updates: Array<Record<string, unknown>>,
  model: ShapeUpdateModel,
): void {
  for (const node of model.nodes) {
    if (model.moved[node.index] === 0) continue;
    const pagePoint = {
      x: model.lastX[node.index] - node.shape.props.w / 2,
      y: model.lastY[node.index] - node.shape.props.h / 2,
    };
    const localPoint = shapeLocalPoint(node.shape, pagePoint, model.geometryHost);
    updates.push({
      id: node.shape.id,
      type: node.shape.type,
      x: localPoint.x,
      y: localPoint.y,
    });
  }
}

function appendEdgeUpdates(
  updates: Array<Record<string, unknown>>,
  model: ShapeUpdateModel,
): void {
  for (const edge of model.edges) {
    if (model.moved[edge.source] === 0 && model.moved[edge.target] === 0) continue;
    updates.push({
      id: edge.shape.id,
      type: edge.shape.type,
      x: model.lastX[edge.source],
      y: model.lastY[edge.source],
      props: {
        ...edge.shape.props,
        start: { x: 0, y: 0 },
        end: {
          x: model.lastX[edge.target] - model.lastX[edge.source],
          y: model.lastY[edge.target] - model.lastY[edge.source],
        },
      },
    });
  }
}

function appendIconUpdates(
  updates: Array<Record<string, unknown>>,
  model: ShapeUpdateModel,
): void {
  for (const icon of model.icons) {
    if (model.moved[icon.node.index] === 0) continue;
    const pagePoint = {
      x: model.lastX[icon.node.index] - icon.shape.props.w / 2,
      y: model.lastY[icon.node.index] - icon.shape.props.h / 2,
    };
    const localPoint = shapeLocalPoint(icon.node.shape, pagePoint, model.geometryHost);
    updates.push({
      id: icon.shape.id,
      ...(icon.node.shape.parentId ? { parentId: icon.node.shape.parentId } : {}),
      type: icon.shape.type,
      x: localPoint.x,
      y: localPoint.y,
    });
  }
}

function appendLabelUpdates(
  updates: Array<Record<string, unknown>>,
  model: ShapeUpdateModel,
): void {
  for (const label of model.labels) {
    if (model.moved[label.node.index] === 0) continue;
    const pagePoint = {
      x: model.lastX[label.node.index] - label.shape.props.w / 2,
      y: model.lastY[label.node.index] + label.node.shape.props.h / 2 + LABEL_GAP,
    };
    const localPoint = shapeLocalPoint(label.node.shape, pagePoint, model.geometryHost);
    updates.push({
      id: label.shape.id,
      ...(label.node.shape.parentId ? { parentId: label.node.shape.parentId } : {}),
      type: label.shape.type,
      x: localPoint.x,
      y: localPoint.y,
    });
  }
}

export function createShapeUpdates(
  model: ShapeUpdateModel,
  engine: GraphLayoutEngine,
): Array<Record<string, unknown>> {
  recordVisibleMovement(model, engine);
  const updates: Array<Record<string, unknown>> = [];
  appendNodeUpdates(updates, model);
  appendEdgeUpdates(updates, model);
  appendIconUpdates(updates, model);
  appendLabelUpdates(updates, model);
  return updates;
}
