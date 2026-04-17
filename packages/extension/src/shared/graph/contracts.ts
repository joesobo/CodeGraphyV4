import type {
  CoreEdgeKind as PluginApiCoreEdgeKind,
  GraphEdgeKind as PluginApiGraphEdgeKind,
  GraphMetadata as PluginApiGraphMetadata,
  GraphMetadataValue as PluginApiGraphMetadataValue,
  GraphNodeShape2D as PluginApiGraphNodeShape2D,
  GraphNodeShape3D as PluginApiGraphNodeShape3D,
  IGraphData as PluginApiGraphData,
  IGraphEdge as PluginApiGraphEdge,
  IGraphEdgeSource as PluginApiGraphEdgeSource,
  IGraphNode as PluginApiGraphNode,
  NodeType as PluginApiNodeType,
} from '../../../../plugin-api/src/graph';

export type CoreEdgeKind = PluginApiCoreEdgeKind;
export type GraphEdgeKind = PluginApiGraphEdgeKind;
export type GraphMetadata = PluginApiGraphMetadata;
export type GraphMetadataValue = PluginApiGraphMetadataValue;
export type GraphNodeShape2D = PluginApiGraphNodeShape2D;
export type GraphNodeShape3D = PluginApiGraphNodeShape3D;
export type IGraphData = PluginApiGraphData;
export type IGraphEdge = PluginApiGraphEdge;
export type IGraphEdgeSource = PluginApiGraphEdgeSource;
export type IGraphNode = PluginApiGraphNode;
export type NodeType = PluginApiNodeType;
