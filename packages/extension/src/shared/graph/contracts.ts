import type {
  CoreEdgeKind as PluginApiCoreEdgeKind,
  GraphEdgeKind as PluginApiGraphEdgeKind,
  GraphMetadata as PluginApiGraphMetadata,
  GraphMetadataValue as PluginApiGraphMetadataValue,
  IGraphData as PluginApiGraphData,
  IGraphEdge as PluginApiGraphEdge,
  IGraphEdgeSource as PluginApiGraphEdgeSource,
  IGraphNode as PluginApiGraphNode,
  NodeType as PluginApiNodeType,
} from '@codegraphy-dev/plugin-api/graph';

export type CoreEdgeKind = PluginApiCoreEdgeKind;
export type GraphEdgeKind = PluginApiGraphEdgeKind;
export type GraphMetadata = PluginApiGraphMetadata;
export type GraphMetadataValue = PluginApiGraphMetadataValue;
export type GraphNodeShape2D =
  | 'circle'
  | 'square'
  | 'rectangle'
  | 'diamond'
  | 'triangle'
  | 'hexagon'
  | 'star';

export interface IGraphNode extends PluginApiGraphNode {
  color?: string;
  x?: number;
  y?: number;
  favorite?: boolean;
  depthLevel?: number;
  shape2D?: GraphNodeShape2D;
  shapeSize2D?: { height: number; width: number };
  cornerRadius2D?: number;
  collisionRadius2D?: number;
  chargeStrengthMultiplier2D?: number;
  fillOpacity2D?: number;
  pointerArea2D?: { height: number; width: number };
  imageUrl?: string;
  isCollapsible?: boolean;
  isCollapsed?: boolean;
  collapsedDescendantCount?: number;
}

export interface IGraphEdge extends PluginApiGraphEdge {
  color?: string;
}

export interface IGraphData extends Omit<PluginApiGraphData, 'edges' | 'nodes'> {
  nodes: IGraphNode[];
  edges: IGraphEdge[];
}
export type IGraphEdgeSource = PluginApiGraphEdgeSource;
export type NodeType = PluginApiNodeType;
