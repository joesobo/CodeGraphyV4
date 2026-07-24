/**
 * @fileoverview File discovery type definitions.
 * @module core/discovery/contracts
 */

/**
 * Options for file discovery.
 */
export interface IDiscoveryOptions {
  /** Absolute path to the workspace root */
  rootPath: string;
  /** Maximum number of files to discover (default: 1000) */
  maxFiles?: number;
  /** Glob patterns for files to include (default: ['**\/*']) */
  include?: string[];
  /** Glob patterns that exclude files from index membership */
  exclude?: string[];
  /** Active graph filter patterns. Matching files remain present but are not newly indexed. */
  filter?: string[];
  /** Whether to respect Git ignored state (default: true) */
  respectGitignore?: boolean;
  /** File extensions to include (e.g., ['.ts', '.js']). If empty, all extensions allowed. */
  extensions?: string[];
  /** Abort signal for cancelling long-running discovery */
  signal?: AbortSignal;
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
  /** Whether Git reports this cached file as ignored during Graph Cache replay. */
  gitIgnored?: boolean;
}

/**
 * Result of a discovery operation.
 */
export interface IDiscoveryResult {
  /** Eligible discovered files, capped by maxFiles */
  files: IDiscoveredFile[];
  /** Discovered directory paths relative to the workspace root */
  directories: string[];
  /** Discovered file and directory paths reported by Git as ignored */
  gitIgnoredPaths?: string[];
  /** Whether the max file limit was hit */
  limitReached: boolean;
  /** Total files found before limit (if limit was reached) */
  totalFound?: number;
  /** Time taken in milliseconds */
  durationMs: number;
}

/** Internal indexing result with paths allowed to remain in the Graph Cache. */
export interface IFileDiscoveryResult extends IDiscoveryResult {
  cacheFilePaths: string[];
}
