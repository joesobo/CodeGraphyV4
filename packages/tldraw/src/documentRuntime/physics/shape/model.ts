export interface ScriptShape {
  id: string;
  parentId?: string;
  rotation?: number;
  type: string;
  x: number;
  y: number;
  props: Record<string, unknown>;
  meta: Record<string, unknown>;
}

export interface FrameShape extends ScriptShape {
  props: Record<string, unknown> & { h: number; w: number };
}

export interface NodeShape extends ScriptShape {
  meta: Record<string, unknown> & { codegraphyEntityId: string; codegraphyKind: 'node' };
  props: Record<string, unknown> & { h: number; w: number };
}

export interface LabelShape extends ScriptShape {
  meta: Record<string, unknown> & { codegraphyKind: 'label'; codegraphyNodeId: string };
  props: Record<string, unknown> & { w: number };
}

export interface IconShape extends ScriptShape {
  meta: Record<string, unknown> & { codegraphyKind: 'icon'; codegraphyNodeId: string };
  props: Record<string, unknown> & { h: number; w: number };
}

export function isNodeShape(shape: ScriptShape): shape is NodeShape {
  return shape.type === 'geo'
    && shape.meta.codegraphyKind === 'node'
    && typeof shape.meta.codegraphyEntityId === 'string'
    && typeof shape.props.w === 'number'
    && typeof shape.props.h === 'number';
}

export function isFrameShape(shape: ScriptShape): shape is FrameShape {
  return shape.type === 'frame'
    && typeof shape.props.w === 'number'
    && typeof shape.props.h === 'number';
}

export function isEdgeShape(shape: ScriptShape): boolean {
  return shape.type === 'arrow' && shape.meta.codegraphyKind === 'edge';
}

export function isLabelShape(shape: ScriptShape): shape is LabelShape {
  return shape.type === 'text'
    && shape.meta.codegraphyKind === 'label'
    && typeof shape.meta.codegraphyNodeId === 'string'
    && typeof shape.props.w === 'number';
}

export function isIconShape(shape: ScriptShape): shape is IconShape {
  return shape.type === 'image'
    && shape.meta.codegraphyKind === 'icon'
    && typeof shape.meta.codegraphyNodeId === 'string'
    && typeof shape.props.w === 'number'
    && typeof shape.props.h === 'number';
}
