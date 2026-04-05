/**
 * @fileoverview The IPlugin interface — the canonical plugin contract.
 *
 * Plugin API v2 is required. Every plugin must declare `apiVersion`
 * and is validated by the host at registration time.
 *
 * @module @codegraphy-vscode/plugin-api/plugin
 */

import type { IConnection, IConnectionSource } from './connection';
import type { IGraphData } from './graph';
import type { CodeGraphyAPI } from './api';

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
 *   async detectConnections() { return []; },
 *   onLoad(api) {
 *     api.on('analysis:completed', ({ graph }) => {
 *       // decorate nodes with coverage data
 *     });
 *   }
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

  /** Optional semver range for the webview-side API contract. */
  webviewApiVersion?: string;

  /** File extensions this plugin can handle (e.g., `['.ts', '.tsx']`). */
  supportedExtensions: string[];

  /**
   * Connection sources this plugin supports.
   * Each source describes a category of relations the plugin can emit.
   * Used by the Plugins panel to let users toggle individual source types.
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
  fileColors?: Record<string, string | {
    color: string;
    shape2D?: 'circle' | 'square' | 'diamond' | 'triangle' | 'hexagon' | 'star';
    shape3D?: 'sphere' | 'cube' | 'octahedron' | 'cone' | 'dodecahedron' | 'icosahedron';
    image?: string;
  }>;

  /**
   * Default filter patterns for this plugin's ecosystem.
   * Merged with user-defined filter patterns at file discovery time —
   * files matching these patterns are excluded from analysis.
   */
  defaultFilters?: string[];

  /**
   * Optional Tier-2 webview contributions injected by the host.
   * Asset paths may be absolute URLs or extension-relative paths.
   */
  webviewContributions?: {
    scripts?: string[];
    styles?: string[];
  };

  // ---------------------------------------------------------------------------
  // Core analysis contract
  // ---------------------------------------------------------------------------

  /**
   * Detect connections in a single file.
   *
   * @param filePath      - Absolute path to the file being analyzed
   * @param content       - The file's content as a string
   * @param workspaceRoot - Absolute path to the workspace root
   * @returns Array of detected connections
   */
  detectConnections(
    filePath: string,
    content: string,
    workspaceRoot: string
  ): Promise<IConnection[]>;

  // ---------------------------------------------------------------------------
  // Optional analysis hooks
  // ---------------------------------------------------------------------------

  /**
   * Initialization hook called when the plugin is first loaded.
   * Use to set up state or resources.
   */
  initialize?(workspaceRoot: string): Promise<void>;

  // ---------------------------------------------------------------------------
  // Lifecycle hooks
  // ---------------------------------------------------------------------------

  /**
   * Called when the plugin is loaded and the host API is available.
   * This is the primary entry point for plugins to register
   * event handlers, views, commands, and decorations.
   */
  onLoad?(api: CodeGraphyAPI): void;

  /**
   * Called when the workspace has been fully scanned and the initial
   * graph is ready.
   */
  onWorkspaceReady?(graph: IGraphData): void;

  /**
   * Called when the webview has loaded and is ready to receive messages.
   */
  onWebviewReady?(): void;

  /**
   * Called before per-file analysis begins.
   */
  onPreAnalyze?(
    files: IAnalysisFile[],
    workspaceRoot: string
  ): Promise<void>;

  /**
   * Called after all files have been analyzed and the graph is built.
   * Plugins can inspect or augment the graph data.
   */
  onPostAnalyze?(graph: IGraphData): void;

  /**
   * Called whenever the graph is rebuilt (e.g., after file changes,
   * view switches, or setting changes).
   */
  onGraphRebuild?(graph: IGraphData): void;

  /**
   * Called when the plugin is about to be unloaded.
   * Dispose all resources, event subscriptions, and decorations here.
   */
  onUnload?(): void;
}
