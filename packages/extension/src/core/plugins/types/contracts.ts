/**
 * @fileoverview Extension-side bridge to the canonical plugin API contracts.
 * @module core/plugins/types/contracts
 */

export type {
  CoreNodeType,
  CoreEdgeKind,
  GraphEdgeKind,
  GraphMetadata,
  GraphMetadataValue,
  IAccessProvider,
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
  IPluginAnalysisContext,
  IPluginAnalysisFileSystem,
  IPluginEdgeType,
  IPluginGraphScopeCapabilities,
  IPluginNodeType,
  NodeType,
} from '../../../../../plugin-api/src';
export type {
  IGraphViewContributions,
  IGraphViewContextMenuContribution,
  IGraphViewForceAdapterContribution,
  IGraphViewNodeDragEndContribution,
  IGraphViewNodeDragState,
  IGraphViewPhysicsSettings,
  IGraphViewProjectionContribution,
  IGraphViewRuntimeEdgeContribution,
  IGraphViewRuntimeNodeContribution,
  IGraphViewUiSlotContribution,
} from '@codegraphy-dev/extension-plugin-api';
import type { IPlugin } from '../../../../../plugin-api/src';
import type { CodeGraphyAPI } from '../api/contracts';

export type { IProjectedConnection } from '@codegraphy-dev/core';
export type { CodeGraphyAPI };

export type GraphNodeShape2D =
  | 'circle'
  | 'square'
  | 'rectangle'
  | 'diamond'
  | 'triangle'
  | 'hexagon'
  | 'star';

export interface IPluginFileColorDefinition {
  color: string;
  shape2D?: GraphNodeShape2D;
  imagePath?: string;
}

export type { IPlugin };

/**
 * Information about a registered plugin.
 */
export interface IPluginInfo {
  /** The plugin instance */
  plugin: IPlugin;
  /** Whether this is a built-in plugin */
  builtIn: boolean;
  /** Source extension ID for community plugins */
  sourceExtension?: string;
  /** Source npm package for package-installed plugins */
  sourcePackage?: string;
  /** Root directory for package-installed plugin assets */
  sourcePackageRoot?: string;
  /** Complete descriptor, package, and runtime identity used for reconciliation. */
  descriptorSignature?: string;
  /** Workspace-specific plugin options */
  options?: Record<string, unknown>;
  /** Host-specific package metadata. Core plugin contracts do not inspect this data. */
  interfaces?: Array<{ id: string; data: unknown }>;
}
