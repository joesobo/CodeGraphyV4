/**
 * @fileoverview CodeGraphy Plugin API type definitions.
 *
 * This package provides the canonical type definitions for building
 * CodeGraphy plugins. It defines:
 *
 * - {@link IPlugin} — the plugin interface (apiVersion is required)
 * - Graph, analysis, connection, and lifecycle event types
 *
 * @module @codegraphy-dev/plugin-api
 */

// Disposable
export type { Disposable } from './disposable';

// Access
export type {
  CodeGraphyAccessKey,
  CodeGraphyAccessState,
  IAccessProvider,
  IAccessRequest,
  IAccessResult,
} from './access';

// Connection source metadata
export type { IConnectionSource } from './connection';

// Plugin data
export type {
  IPluginDataHost,
  IPluginDataSaveOptions,
} from './data';

// Analysis
export type {
  IAnalysisNode,
  IAnalysisRange,
  IAnalysisRelation,
  IAnalysisSymbol,
  IFileAnalysisResult,
  IPluginEdgeType,
  IPluginGraphTypeDescription,
  IPluginGraphTypeExample,
  IPluginNodeType,
} from './analysis';

// Graph data
export type {
  CoreNodeType,
  CoreEdgeKind,
  GraphEdgeKind,
  GraphMetadata,
  GraphMetadataValue,
  IGraphNode,
  IGraphEdge,
  IGraphEdgeSource,
  IGraphData,
  NodeType,
  IGraphNodeRange,
  IGraphNodeSymbolMetadata,
} from './graph';

// Plugin interface
export type {
  IPlugin,
  IPluginGraphScopeCapabilities,
  IPluginGraphScopeCapabilityContext,
  IPluginFactory,
  IPluginFactoryOptions,
  IPluginUpdateImpact,
  IPluginUpdateImpactPolicy,
  IAnalysisFile,
  IPluginAnalysisContext,
  IPluginAnalysisFileSystem,
  IPluginWorkspaceFile,
} from './plugin';
