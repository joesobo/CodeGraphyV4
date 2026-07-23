import {
  isEdgeShape,
  isFrameShape,
  isIconShape,
  isLabelShape,
  isNodeShape,
  type ScriptShape,
} from './model';

function structurePart(shape: ScriptShape): string | undefined {
  if (isNodeShape(shape)) {
    return `node:${shape.meta.codegraphyEntityId}:${shape.parentId ?? ''}:${shape.props.w}:${shape.props.h}`;
  }
  if (isFrameShape(shape)) {
    return `frame:${shape.id}:${shape.parentId ?? ''}:${shape.x}:${shape.y}:${shape.rotation ?? 0}:${shape.props.w}:${shape.props.h}`;
  }
  if (isEdgeShape(shape)) {
    return `edge:${shape.id}:${String(shape.meta.codegraphyFrom)}:${String(shape.meta.codegraphyTo)}`;
  }
  if (isLabelShape(shape)) {
    return `label:${shape.id}:${shape.meta.codegraphyNodeId}:${shape.props.w}`;
  }
  if (isIconShape(shape)) {
    return `icon:${shape.id}:${shape.meta.codegraphyNodeId}:${shape.props.w}:${shape.props.h}`;
  }
  return undefined;
}

export function graphStructureKey(shapes: readonly ScriptShape[]): string {
  return shapes.flatMap(shape => structurePart(shape) ?? []).sort().join('|');
}
