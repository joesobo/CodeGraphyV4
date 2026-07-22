export interface ScriptShape {
  id: string;
  type: string;
  x: number;
  y: number;
  props: Record<string, unknown>;
  meta: Record<string, unknown>;
}

export interface NodeShape extends ScriptShape {
  meta: Record<string, unknown> & { codegraphyEntityId: string; codegraphyKind: 'node' };
  props: Record<string, unknown> & { h: number; w: number };
}

export function isNodeShape(shape: ScriptShape): shape is NodeShape {
  return shape.type === 'geo'
    && shape.meta.codegraphyKind === 'node'
    && typeof shape.meta.codegraphyEntityId === 'string'
    && typeof shape.props.w === 'number'
    && typeof shape.props.h === 'number';
}

export function isEdgeShape(shape: ScriptShape): boolean {
  return shape.type === 'arrow' && shape.meta.codegraphyKind === 'edge';
}
