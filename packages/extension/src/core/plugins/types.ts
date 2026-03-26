/**
 * @fileoverview Plugin system type definitions.
 * Defines the interface that all CodeGraphy plugins must implement,
 * whether built-in or community-provided.
 * @module core/plugins/types
 */

/**
 * Represents a detection rule declared by a plugin.
 * Rules describe categories of connections a plugin can detect.
 */
export interface IRule {
  /** Unique identifier within the plugin (e.g., 'es6-import', 'preload') */
  id: string;
  /** Human-readable name (e.g., 'ES6 Imports') */
  name: string;
  /** Short description (e.g., 'import x from "y", import { a } from "y"') */
  description: string;
}

/**
 * Interface for a rule detection module.
 * Each rule file in a plugin's rules/ folder exports a detect function matching this shape.
 */
export interface IRuleDetector<TContext = unknown> {
  /** Rule ID — must match the corresponding entry in codegraphy.json */
  id: string;

  /**
   * Detect connections for this rule.
   *
   * @param content - File content as string
   * @param filePath - Absolute path to the file
   * @param context - Plugin-specific context (e.g., PathResolver instance)
   * @returns Array of connections. Each MUST have ruleId set to this rule's id.
   */
  detect(
    content: string,
    filePath: string,
    context: TContext
  ): IConnection[];
}

/**
 * Represents a detected connection (import) from one file to another.
 */
export interface IConnection {
  /** The import specifier as written in the source (e.g., './utils', 'lodash') */
  specifier: string;
  /** The resolved absolute file path, or null if unresolved (external package) */
  resolvedPath: string | null;
  /** The type of import */
  type: 'static' | 'dynamic' | 'require' | 'reexport';
  /** The rule that detected this connection (e.g., 'es6-import'). */
  ruleId?: string;
}

/**
 * The main plugin interface that all CodeGraphy plugins must implement.
 * 
 * Plugins are responsible for detecting connections (imports/dependencies)
 * in files they support. Each plugin declares which file extensions it
 * handles via `supportedExtensions`.
 * 
 * @example
 * ```typescript
 * const typescriptPlugin: IPlugin = {
 *   id: 'codegraphy.typescript',
 *   name: 'TypeScript',
 *   version: '1.0.0',
 *   apiVersion: '^2.0.0',
 *   supportedExtensions: ['.ts', '.tsx', '.js', '.jsx'],
 *   
 *   async detectConnections(filePath, content) {
 *     // Parse imports and return connections
 *     return [
 *       { specifier: './utils', resolvedPath: '/src/utils.ts', type: 'static' },
 *       { specifier: 'lodash', resolvedPath: null, type: 'static' },
 *     ];
 *   }
 * };
 * ```
 */
export interface IPlugin {
  /** Unique identifier for the plugin (e.g., 'codegraphy.typescript') */
  id: string;
  
  /** Human-readable name for display */
  name: string;
  
  /** Semantic version string */
  version: string;

  /** Required semver range for Plugin API compatibility (e.g., '^2.0.0'). */
  apiVersion: string;

  /** Optional semver range for webview-side API compatibility. */
  webviewApiVersion?: string;
  
  /** File extensions this plugin can handle (e.g., ['.ts', '.tsx']) */
  supportedExtensions: string[];
  
  /**
   * Optional detection rules this plugin supports.
   * Each rule describes a category of connections the plugin can detect.
   * Used by the Plugins panel to let users toggle individual rule types.
   */
  rules?: IRule[];

  /**
   * Optional preferred colors for supported file extensions.
   * These colors override generated colors but can be overridden by user settings.
   * 
   * Supports three pattern types:
   * - Extensions: `.ts`, `.md`
   * - Exact filenames: `project.godot`, `Makefile`
   * - Glob patterns: `**\/*.test.ts`
   * 
   * Values can be a color string or an object with color, shape, and image options.
   *
   * @example
   * ```typescript
   * fileColors: {
   *   '.gd': '#A5B4FC',    // Simple color string
   *   '.tscn': { color: '#6EE7B7', shape2D: 'hexagon', shape3D: 'dodecahedron' },
   *   'project.godot': { color: '#478CBF', shape2D: 'star', image: 'assets/icon.png' },
   * }
   * ```
   */
  fileColors?: Record<string, string | {
    color: string;
    shape2D?: import('../../shared/contracts').NodeShape2D;
    shape3D?: import('../../shared/contracts').NodeShape3D;
    image?: string;  // relative path from plugin root
  }>;
  
  /**
   * Optional default filter patterns for this plugin's ecosystem.
   * Merged with user-defined filter patterns at file discovery time —
   * files matching these patterns are excluded from analysis.
   *
   * Use for build artifacts, caches, generated files, and directories
   * that should not appear in the graph.
   *
   * @example
   * ```typescript
   * // Godot plugin
   * defaultFilters: ['**\/.godot\/**', '**\/*.import', '**\/*.uid']
   * ```
   */
  defaultFilters?: string[];

  /**
   * Optional Tier-2 webview contributions to inject when the webview is ready.
   * Paths may be absolute URLs or extension-relative asset paths.
   */
  webviewContributions?: {
    scripts?: string[];
    styles?: string[];
  };
  
  /**
   * Detects connections (imports) in a file.
   * 
   * @param filePath - Absolute path to the file being analyzed
   * @param content - The file's content as a string
   * @param workspaceRoot - Absolute path to the workspace root
   * @returns Array of detected connections
   */
  detectConnections(
    filePath: string,
    content: string,
    workspaceRoot: string
  ): Promise<IConnection[]>;
  
  /**
   * Optional initialization hook called when the plugin is loaded.
   * Use this to set up any required state or resources.
   *
   * @param workspaceRoot - Absolute path to the workspace root
   */
  initialize?(workspaceRoot: string): Promise<void>;

  /**
   * Called when the plugin is loaded and the host API is available.
   * Plugins use this to register events, commands, views, and decorations.
   */
  onLoad?(api: import('./codeGraphyApi').CodeGraphyAPIImpl): void;

  /** Called once after the initial workspace graph is ready. */
  onWorkspaceReady?(graph: import('../../shared/contracts').IGraphData): void;

  /** Called when the webview is ready to receive plugin messages. */
  onWebviewReady?(): void;

  /** Called before each analysis pass. */
  onPreAnalyze?(
    files: Array<{ absolutePath: string; relativePath: string; content: string }>,
    workspaceRoot: string
  ): Promise<void>;

  /** Called after each full analysis pass. */
  onPostAnalyze?(graph: import('../../shared/contracts').IGraphData): void;

  /** Called when the graph is rebuilt from cache without re-analysis. */
  onGraphRebuild?(graph: import('../../shared/contracts').IGraphData): void;

  /** Called before plugin teardown. */
  onUnload?(): void;
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
}
