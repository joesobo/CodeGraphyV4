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
} from '@codegraphy-dev/plugin-api';
import type { IPlugin } from '@codegraphy-dev/plugin-api';
import type { CodeGraphyAPI } from '../api/contracts';

export type { IProjectedConnection } from '@codegraphy-dev/core';
export type { CodeGraphyAPI };

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
  /** Static descriptor, package, and build identity available before runtime creation. */
  sourceSignature?: string;
  /** Workspace-specific plugin options */
  options?: Record<string, unknown>;
}
