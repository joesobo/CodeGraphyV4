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
   * These are merged with user-defined exclude patterns.
   * 
   * @example
   * ```typescript
   * // TypeScript plugin
   * defaultExclude: ['**\/node_modules\/**', '**\/dist\/**']
   * 
   * // Godot plugin  
   * defaultExclude: ['**\/.godot\/**', '**\/*.import']
   * ```
   */
  defaultExclude?: string[];
  
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
