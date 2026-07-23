import type { ScriptShape } from './model';

export interface ShapePoint {
  x: number;
  y: number;
}

export interface ShapeBounds extends ShapePoint {
  h: number;
  w: number;
}

export interface ShapeGeometryHost {
  getPointInParentSpace?(shape: ScriptShape, point: ShapePoint): ShapePoint;
  getShapePageBounds?(shape: ScriptShape): ShapeBounds | undefined;
}

export function shapePageBounds(
  shape: ScriptShape,
  host?: ShapeGeometryHost,
): ShapeBounds {
  return host?.getShapePageBounds?.(shape) ?? {
    h: Number(shape.props.h ?? 0),
    w: Number(shape.props.w ?? 0),
    x: shape.x,
    y: shape.y,
  };
}

export function shapeLocalPoint(
  shape: ScriptShape,
  pagePoint: ShapePoint,
  host?: ShapeGeometryHost,
): ShapePoint {
  return host?.getPointInParentSpace?.(shape, pagePoint) ?? pagePoint;
}
