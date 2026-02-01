/**
 * @fileoverview File discovery type definitions.
 * @module core/discovery/types
 */

/**
 * Options for file discovery.
 */
export interface IDiscoveryOptions {
  /** Absolute path to the workspace root */
  rootPath: string;
  /** Maximum number of files to discover (default: 100) */
  maxFiles?: number;
  /** Glob patterns for files to include (default: ['**\/*']) */
  include?: string[];
  /** Glob patterns for files to exclude */
  exclude?: string[];
  /** Whether to respect .gitignore patterns (default: true) */
  respectGitignore?: boolean;
  /** File extensions to include (e.g., ['.ts', '.js']). If empty, all extensions allowed. */
  extensions?: string[];
}

/**
 * Information about a discovered file.
 */
export interface IDiscoveredFile {
  /** Relative path from workspace root */
  relativePath: string;
  /** Absolute path to the file */
  absolutePath: string;
  /** File extension (e.g., '.ts') */
  extension: string;
  /** File name without path */
  name: string;
}

/**
 * Result of a discovery operation.
 */
export interface IDiscoveryResult {
  /** Discovered files */
  files: IDiscoveredFile[];
  /** Whether the max file limit was hit */
  limitReached: boolean;
  /** Total files found before limit (if limit was reached) */
  totalFound?: number;
  /** Time taken in milliseconds */
  durationMs: number;
}
