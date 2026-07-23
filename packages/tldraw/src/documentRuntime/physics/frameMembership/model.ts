import { shapePageBounds, type ShapeGeometryHost } from '../shape/geometry';
import {
  isFrameShape,
  isIconShape,
  isLabelShape,
  isNodeShape,
  type FrameShape,
  type NodeShape,
  type ScriptShape,
} from '../shape/model';

export interface FrameAssignment {
  nodeEntityId: string;
  parentId: string;
}

export interface CompanionParentAssignment extends FrameAssignment {
  shapeIds: string[];
}

export function companionParentAssignments(
  shapes: readonly ScriptShape[],
  pageId: string,
): CompanionParentAssignment[] {
  const nodeParents = new Map(
    shapes.filter(isNodeShape).map(node => [
      node.meta.codegraphyEntityId,
      node.parentId ?? pageId,
    ]),
  );
  const assignments = new Map<string, CompanionParentAssignment>();
  for (const shape of shapes) {
    if (!isIconShape(shape) && !isLabelShape(shape)) continue;
    const nodeEntityId = shape.meta.codegraphyNodeId;
    const parentId = nodeParents.get(nodeEntityId);
    if (!parentId || (shape.parentId ?? pageId) === parentId) continue;
    const assignment = assignments.get(nodeEntityId) ?? {
      nodeEntityId,
      parentId,
      shapeIds: [],
    };
    assignment.shapeIds.push(shape.id);
    assignments.set(nodeEntityId, assignment);
  }
  return [...assignments.values()];
}

function containsBounds(
  frame: FrameShape,
  node: NodeShape,
  geometryHost?: ShapeGeometryHost,
): boolean {
  const frameBounds = shapePageBounds(frame, geometryHost);
  const nodeBounds = shapePageBounds(node, geometryHost);
  return nodeBounds.x >= frameBounds.x
    && nodeBounds.y >= frameBounds.y
    && nodeBounds.x + nodeBounds.w <= frameBounds.x + frameBounds.w
    && nodeBounds.y + nodeBounds.h <= frameBounds.y + frameBounds.h;
}

function containsNodeCenter(
  frame: FrameShape,
  node: NodeShape,
  geometryHost?: ShapeGeometryHost,
): boolean {
  const frameBounds = shapePageBounds(frame, geometryHost);
  const nodeBounds = shapePageBounds(node, geometryHost);
  const centerX = nodeBounds.x + nodeBounds.w / 2;
  const centerY = nodeBounds.y + nodeBounds.h / 2;
  return centerX >= frameBounds.x
    && centerY >= frameBounds.y
    && centerX <= frameBounds.x + frameBounds.w
    && centerY <= frameBounds.y + frameBounds.h;
}

export function enclosedNodeAssignments(
  shapes: readonly ScriptShape[],
  newFrameIds: ReadonlySet<string>,
  geometryHost?: ShapeGeometryHost,
): FrameAssignment[] {
  const frames = shapes.filter(
    (shape): shape is FrameShape => isFrameShape(shape) && newFrameIds.has(shape.id),
  );
  const assignments: FrameAssignment[] = [];
  for (const node of shapes.filter(isNodeShape)) {
    const frame = frames.find(candidate => (
      candidate.parentId === node.parentId && containsBounds(candidate, node, geometryHost)
    ));
    if (!frame) continue;
    assignments.push({
      nodeEntityId: node.meta.codegraphyEntityId,
      parentId: frame.id,
    });
  }
  return assignments;
}

export function nodeDropAssignment(
  shapes: readonly ScriptShape[],
  nodeEntityId: string,
  pageId: string,
  geometryHost?: ShapeGeometryHost,
): FrameAssignment | undefined {
  const node = shapes.find(
    (shape): shape is NodeShape => isNodeShape(shape)
      && shape.meta.codegraphyEntityId === nodeEntityId,
  );
  if (!node) return undefined;
  const frames = shapes.filter(isFrameShape);
  let targetFrame: FrameShape | undefined;
  for (let index = frames.length - 1; index >= 0; index -= 1) {
    if (containsNodeCenter(frames[index], node, geometryHost)) {
      targetFrame = frames[index];
      break;
    }
  }
  const parentId = targetFrame?.id ?? pageId;
  if ((node.parentId ?? pageId) === parentId) return undefined;
  return { nodeEntityId, parentId };
}
