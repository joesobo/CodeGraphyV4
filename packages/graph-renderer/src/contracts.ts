export type GraphDirectionMode = 'arrows' | 'particles' | 'none';

export type GraphNodeShape =
  | 'circle'
  | 'square'
  | 'rectangle'
  | 'diamond'
  | 'triangle'
  | 'hexagon'
  | 'star';

export interface GraphRendererCamera {
  centerX: number;
  centerY: number;
  zoom: number;
}

export interface GraphRendererNode {
  id: string;
  x?: number;
  y?: number;
}

export interface GraphRendererLink {
  bidirectional?: boolean;
  curvature?: number;
  source?: string | GraphRendererNode;
  target?: string | GraphRendererNode;
}

export interface GraphRendererNodeStyle {
  borderColor: string;
  borderWidth: number;
  cornerRadius: number;
  fillColor: string;
  fillOpacity: number;
  height: number;
  opacity: number;
  shape: GraphNodeShape;
  width: number;
}

export interface GraphRendererFrame {
  backgroundColor: string;
  camera: GraphRendererCamera;
  cssHeight: number;
  cssWidth: number;
  devicePixelRatio: number;
  directionMode: GraphDirectionMode;
  edgeSources: Uint32Array;
  edgeTargets: Uint32Array;
  getArrowColor(this: void, link: GraphRendererLink): string;
  getLinkColor(this: void, link: GraphRendererLink): string;
  getLinkOpacity(this: void, link: GraphRendererLink): number;
  getLinkWidth(this: void, link: GraphRendererLink): number;
  getNodeStyle(this: void, node: GraphRendererNode): GraphRendererNodeStyle;
  hoveredLink?: GraphRendererLink | null;
  hoveredNodeIndex: number;
  hoveredNodeScale: number;
  links: readonly GraphRendererLink[];
  nodes: readonly GraphRendererNode[];
  nodeX: Float32Array;
  nodeY: Float32Array;
  positionVersion: number;
  styleVersion: number;
}
