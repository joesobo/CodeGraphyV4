/**
 * @fileoverview Plugin system type definitions.
 * Defines the interface that all CodeGraphy plugins must implement,
 * whether built-in or community-provided.
 * @module core/plugins/types
 */

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
  
  /** File extensions this plugin can handle (e.g., ['.ts', '.tsx']) */
  supportedExtensions: string[];
  
  /**
   * Optional preferred colors for supported file extensions.
   * These colors override generated colors but can be overridden by user settings.
   * 
   * Supports three pattern types:
   * - Extensions: `.ts`, `.md`
   * - Exact filenames: `project.godot`, `Makefile`
   * - Glob patterns: `**\/*.test.ts`
   * 
   * @example
   * ```typescript
   * fileColors: {
   *   '.gd': '#A5B4FC',    // Soft indigo for GDScript
   *   '.tscn': '#6EE7B7',  // Soft emerald for scenes
   * }
   * ```
   */
  fileColors?: Record<string, string>;
  
  /**
   * Optional default exclude patterns for this plugin's ecosystem.
   * Applied at file discovery time — files matching these patterns are never
   * read or analyzed. Not shown in the Settings Panel.
   *
   * Use for build artifacts, caches, and directories that should never appear.
   *
   * @example
   * ```typescript
   * // Godot plugin
   * defaultExclude: ['**\/.godot\/**', '**\/*.import']
   * ```
   */
  defaultExclude?: string[];

  /**
   * Optional default filter patterns for this plugin's ecosystem.
   * Applied at the same level as user-defined filter patterns (file discovery)
   * but surfaced in the Settings Panel as read-only "plugin defaults" so users
   * can see what is being filtered and why.
   *
   * Use for generated files that users might want to know about but rarely
   * want cluttering their graph (e.g., *.uid in Godot 4, *.d.ts in TypeScript).
   *
   * @example
   * ```typescript
   * // Godot plugin
   * defaultFilterPatterns: ['**\/*.uid']
   * ```
   */
  defaultFilterPatterns?: string[];
  
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
   * Optional pre-analysis hook called once before per-file detectConnections calls.
   * Receives all discovered files matching this plugin's extensions with their content.
   * Use this to build workspace-wide indexes that require seeing all files before
   * resolving cross-file references (e.g., class_name maps in GDScript).
   *
   * @param files - All discovered files for this plugin's extensions
   * @param workspaceRoot - Absolute path to the workspace root
   */
  preAnalyze?(
    files: Array<{ absolutePath: string; relativePath: string; content: string }>,
    workspaceRoot: string
  ): Promise<void>;

  /**
   * Optional cleanup hook called when the plugin is unloaded.
   * Use this to release any resources.
   */
  dispose?(): void;
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
