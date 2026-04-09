/**
 * @fileoverview Configuration defaults and types for CodeGraphy's repo-local settings.
 * @module extension/config/defaults
 */

/**
 * Default exclude patterns for file discovery.
 * These patterns are excluded by default to avoid analyzing
 * build artifacts, dependencies, and non-source files.
 */
export const DEFAULT_EXCLUDE_PATTERNS: readonly string[] = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/out/**',
  '**/.git/**',
  '**/.codegraphy/**',
  '**/coverage/**',
  '**/*.min.js',
  '**/*.bundle.js',
  '**/*.map',
];

/**
 * Configuration interface matching the settings persisted under `.codegraphy/settings.json`.
 */
export interface ICodeGraphyConfig {
  /** Maximum number of files to analyze */
  maxFiles: number;
  /** Glob patterns for files to include */
  include: string[];
  /** Whether to respect .gitignore patterns */
  respectGitignore: boolean;
  /** Whether to show orphan nodes (files with no connections) */
  showOrphans: boolean;
  /** How to display bidirectional connections */
  bidirectionalEdges: 'separate' | 'combined';
  /** List of plugin extension names to enable */
  plugins: string[];
  /** List of disabled plugin IDs */
  disabledPlugins: string[];
  /** Ordered plugin IDs, highest priority first */
  pluginOrder: string[];
}
