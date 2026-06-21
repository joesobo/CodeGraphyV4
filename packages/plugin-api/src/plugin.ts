/**
 * @fileoverview The IPlugin interface — the canonical plugin contract.
 *
 * Plugin API v2 is required. Every plugin must declare `apiVersion`
 * and is validated by the host at registration time.
 *
 * @module @codegraphy-dev/plugin-api/plugin
 */

import type {
  IFileAnalysisResult,
  IPluginEdgeType,
  IPluginNodeType,
} from './analysis';
import type { CodeGraphyAccessKey, IAccessProvider } from './access';
import type { IConnectionSource } from './connection';
import type { IPluginDataHost } from './data';
import type { Disposable } from './disposable';
import type {
  GraphEdgeKind,
  GraphNodeShape2D,
  GraphNodeShape3D,
  IGraphData,
  NodeType,
} from './graph';
import type { IGraphViewContributions } from './graphView';

export interface IPluginWebviewContributions {
  scripts?: string[];
  styles?: string[];
  assets?: IPluginWebviewAsset[];
}

export interface IPluginWebviewAsset {
  id: string;
  label: string;
  path: string;
  kind?: string;
  metadata?: Record<string, unknown>;
}

export interface IPluginGraphScopeCapabilityContext {
  /**
   * File paths from the indexed workspace graph that made the plugin applicable.
   */
  filePaths: readonly string[];
}

export interface IPluginGraphScopeCapabilities {
  nodeTypes?: readonly NodeType[];
  edgeTypes?: readonly GraphEdgeKind[];
}

export interface IPluginWebviewMessage {
  type: string;
  data: unknown;
}

export interface IPluginExportRequest {
  filename: string;
  content: string | Uint8Array;
  filters?: Record<string, string[]>;
  title?: string;
  successMessage?: string;
}

export interface IPluginExporter {
  id: string;
  label: string;
  description?: string;
  group?: string;
  run(this: void): void | Promise<void>;
}

export interface IPluginToolbarActionItem {
  id: string;
  label: string;
  description?: string;
  run(this: void): void | Promise<void>;
}

export interface IPluginToolbarAction {
  id: string;
  label: string;
  icon?: string;
  description?: string;
  items: IPluginToolbarActionItem[];
}

export interface IPluginHostApi {
  getGraph(): IGraphData;
  sendToWebview(message: IPluginWebviewMessage): void;
  onWebviewMessage(handler: (message: IPluginWebviewMessage) => void): Disposable;
  registerExporter(exporter: IPluginExporter): Disposable;
  registerToolbarAction(action: IPluginToolbarAction): Disposable;
  saveExport(request: IPluginExportRequest): Promise<void>;
  getWorkspaceRoot(): string;
  log(level: 'info' | 'warn' | 'error', ...args: unknown[]): void;
}

/**
 * File metadata passed to bulk analysis hooks.
 */
export interface IAnalysisFile {
  /** Absolute path to the file. */
  absolutePath: string;
  /** Path relative to the workspace root. */
  relativePath: string;
  /** File content as a string. */
  content: string;
}

export interface IPluginAnalysisFileSystem {
  exists(filePath: string): Promise<boolean>;
  isDirectory(filePath: string): Promise<boolean>;
  isFile(filePath: string): Promise<boolean>;
  listDirectory(filePath: string): Promise<string[] | null>;
  readTextFile(filePath: string): Promise<string | null>;
}

export interface IPluginAnalysisContext {
  mode: 'workspace' | 'timeline';
  commitSha?: string;
  fileSystem: IPluginAnalysisFileSystem;
  features?: {
    symbols?: boolean;
  };
  options?: Record<string, unknown>;
}

export interface IPluginFileColorDefinition {
  color: string;
  shape2D?: GraphNodeShape2D;
  shape3D?: GraphNodeShape3D;
  /** Relative path from the plugin root to an image asset. */
  imagePath?: string;
}

export interface IPluginFactoryOptions {
  /** Workspace-scoped persistence owned by the plugin id returned from the factory. */
  dataHost?: IPluginDataHost;
  /** Merged package default options and CodeGraphy Workspace plugin options. */
  options?: Record<string, unknown>;
}

export type IPluginFactory = (options?: IPluginFactoryOptions) => IPlugin | Promise<IPlugin>;

/**
 * The main plugin interface for CodeGraphy.
 *
 * All plugins implement this single interface and must declare `apiVersion`.
 *
 * @example
 * ```typescript
 * const plugin: IPlugin = {
 *   id: 'myplugin.coverage',
 *   name: 'Coverage Overlay',
 *   version: '0.1.0',
 *   apiVersion: '^2.0.0',
 *   supportedExtensions: [],
 *   async analyzeFile(filePath) {
 *     return { filePath, relations: [] };
 *   },
 * };
 * ```
 */
export interface IPlugin {
  /** Unique identifier for the plugin (e.g., 'codegraphy.typescript'). */
  id: string;

  /** Human-readable name for display. */
  name: string;

  /** Semantic version string. */
  version: string;

  /**
   * Semver range indicating which Plugin API version this plugin targets.
   */
  apiVersion: string;

  /** File extensions this plugin can handle (e.g., `['.ts', '.tsx']`, or `['*']` for all files). */
  supportedExtensions: string[];

  /** Access required before this plugin's gated contributions can run. */
  requiresAccess?: CodeGraphyAccessKey | readonly CodeGraphyAccessKey[];

  /** Optional Access Provider registered by account/status plugins such as Pro. */
  accessProvider?: IAccessProvider;

  /**
   * Connection sources this plugin supports.
   * Each source describes a category of relations the plugin can emit.
   * These source IDs flow into graph-edge provenance, exports, and any source-level filtering.
   */
  sources?: IConnectionSource[];

  /**
   * Preferred colors for supported file extensions.
   * These colors override generated colors but can be overridden by user settings.
   *
   * Supports three pattern types:
   * - Extensions: `.ts`, `.md`
   * - Exact filenames: `project.godot`, `Makefile`
   * - Glob patterns: `**\/*.test.ts`
   */
  fileColors?: Record<string, string | IPluginFileColorDefinition>;

  /**
   * Default filter patterns for this plugin's ecosystem.
   * Merged with user-defined filter patterns at file discovery time —
   * files matching these patterns are excluded from analysis.
   */
  defaultFilters?: string[];

  /** Optional Graph View runtime, UI, menu, projection, and force contributions. */
  graphView?: IGraphViewContributions;

  /** Optional webview API range this plugin's injected webview assets target. */
  webviewApiVersion?: string;

  /** Optional webview scripts and styles loaded into CodeGraphy Graph View. */
  webviewContributions?: IPluginWebviewContributions;

  // ---------------------------------------------------------------------------
  // Core analysis contract
  // ---------------------------------------------------------------------------

  /**
   * Per-file analysis result contract.
   * Plugins can return symbols, relations, extra nodes, and node/edge type contributions.
   * This is the primary analysis hook for plugin-contributed code analysis.
   */
  analyzeFile?(
    filePath: string,
    content: string,
    workspaceRoot: string,
    context?: IPluginAnalysisContext,
  ): Promise<IFileAnalysisResult>;

  /**
   * Optional node-type contributions shown in graph controls and legends.
   */
  contributeNodeTypes?(): IPluginNodeType[];

  /**
   * Optional edge-type contributions shown in graph controls and legends.
   */
  contributeEdgeTypes?(): IPluginEdgeType[];

  /**
   * Optional Graph Scope capabilities this plugin can make relevant when it is
   * applicable to the indexed workspace.
   *
   * These declarations are independent from emitted graph output, so graph
   * controls can show relevant toggles even before the current graph contains
   * matching nodes or edges. Plugins may declare core and plugin-owned node
   * types and edge kinds.
   */
  contributeGraphScopeCapabilities?(
    context?: IPluginGraphScopeCapabilityContext,
  ): IPluginGraphScopeCapabilities;

  // ---------------------------------------------------------------------------
  // Optional analysis hooks
  // ---------------------------------------------------------------------------

  /**
   * Initialization hook called when the plugin is first loaded.
   * Use to set up state or resources.
   */
  initialize?(workspaceRoot: string, context?: IPluginAnalysisContext): Promise<void>;

  /**
   * Called when the host creates this plugin's scoped runtime API.
   * Use this to bridge package-owned state and commands to injected webview assets.
   */
  onLoad?(api: IPluginHostApi): void;

  /**
   * Called when the Graph View webview has finished its initial ready handshake.
   * Use this to send plugin-owned state to injected webview assets after the host
   * is ready to deliver messages.
   */
  onWebviewReady?(): void;

  // ---------------------------------------------------------------------------
  // Lifecycle hooks
  // ---------------------------------------------------------------------------

  /**
   * Called when the workspace has been fully scanned and the initial
   * graph is ready.
   */
  onWorkspaceReady?(graph: IGraphData): void;

  /**
   * Called before per-file analysis begins.
   */
  onPreAnalyze?(
    files: IAnalysisFile[],
    workspaceRoot: string,
    context?: IPluginAnalysisContext,
  ): Promise<void>;

  /**
   * Called before an incremental save-driven re-analysis.
   * Plugins can update internal indexes from the changed files and optionally
   * request additional workspace-relative files to re-analyze.
   *
   * Return `undefined` or an empty array when only the changed files need work.
   */
  onFilesChanged?(
    files: IAnalysisFile[],
    workspaceRoot: string,
    context?: IPluginAnalysisContext,
  ): Promise<readonly string[] | void>;

  /**
   * Called after all files have been analyzed and the graph is built.
   * Plugins can inspect or augment the graph data.
   */
  onPostAnalyze?(graph: IGraphData): void;

  /**
   * Called whenever the graph is rebuilt (e.g., after file changes,
   * graph-control toggles, plugin toggles, or setting changes).
   */
  onGraphRebuild?(graph: IGraphData): void;

  /**
   * Called when the plugin is about to be unloaded.
   * Dispose parser state, caches, event subscriptions, and other headless resources here.
   */
  onUnload?(): void;
}
