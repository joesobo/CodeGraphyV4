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
  GraphNodeShape2D,
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
  IPluginAnalysisContext,
  IPluginAnalysisFileSystem,
  IPluginEdgeType,
  IPluginFileColorDefinition,
  IPluginGraphScopeCapabilities,
  IPluginNodeType,
  NodeType,
} from '../../../../../plugin-api/src';
import type { IPlugin as HeadlessPlugin } from '../../../../../plugin-api/src';
import type { CodeGraphyAPI } from '../api/contracts';

export type { IProjectedConnection } from '@codegraphy-dev/core';
export type { CodeGraphyAPI };

export interface IPluginWebviewContributions {
  scripts?: string[];
  styles?: string[];
}

export interface IPlugin extends HeadlessPlugin {
  /** Extension-owned API bridge for plugin surfaces that are not part of the headless npm contract. */
  onLoad?(api: CodeGraphyAPI): void;

  /** Extension-owned webview readiness hook. Language plugins should stay headless. */
  onWebviewReady?(): void;

  /** Extension-local webview contract version for injected graph-view assets. */
  webviewApiVersion?: string;

  /** Extension-local webview assets injected into the CodeGraphy graph view. */
  webviewContributions?: IPluginWebviewContributions;
}

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
  /** Workspace-specific plugin options */
  options?: Record<string, unknown>;
}
