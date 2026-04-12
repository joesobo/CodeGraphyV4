/**
 * @fileoverview Extension-side bridge to the canonical plugin API contracts.
 * @module core/plugins/types/contracts
 */

export type {
  CoreNodeType,
  CodeGraphyAPI,
  CoreEdgeKind,
  GraphEdgeKind,
  GraphMetadata,
  GraphMetadataValue,
  GraphNodeShape2D,
  GraphNodeShape3D,
  IAnalysisFile,
  IAnalysisNode,
  IAnalysisRange,
  IAnalysisRelation,
  IAnalysisSymbol,
  IConnectionSource,
  IFileAnalysisResult,
  IGraphData,
  IGraphEdge,
  IGraphEdgeSource,
  IGraphNode,
  IPlugin,
  IPluginEdgeType,
  IPluginFileColorDefinition,
  IPluginNodeType,
  NodeType,
} from '../../../../../plugin-api/src';

export type { IProjectedConnection } from './projectedConnection';

/**
 * Information about a registered plugin.
 */
export interface IPluginInfo {
  /** The plugin instance */
  plugin: import('../../../../../plugin-api/src').IPlugin;
  /** Whether this is a built-in plugin */
  builtIn: boolean;
  /** Source extension ID for community plugins */
  sourceExtension?: string;
}
