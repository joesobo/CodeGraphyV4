/**
 * @fileoverview Connection and rule types for plugin analysis.
 * @module @codegraphy/plugin-api/connection
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
 * Each rule file in a plugin's rules/ folder exports a detect function
 * matching this shape.
 */
export interface IRuleDetector<TContext = unknown> {
  /** Rule ID — must match the corresponding entry in the plugin's rules array. */
  id: string;

  /**
   * Detect connections for this rule.
   *
   * @param content  - File content as string
   * @param filePath - Absolute path to the file
   * @param context  - Plugin-specific context (e.g., PathResolver instance)
   * @returns Array of connections. Each MUST have ruleId set to this rule's id.
   */
  detect(content: string, filePath: string, context: TContext): IConnection[];
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
