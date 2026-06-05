/**
 * @fileoverview Configuration defaults and types for CodeGraphy's repo-local settings.
 * @module extension/config/defaults
 */

import type { CodeGraphyWorkspacePluginSettings } from '@codegraphy-dev/core';
export { DEFAULT_EXCLUDE_PATTERNS } from './excludePatterns';

/**
 * Configuration interface matching the settings persisted under `.codegraphy/settings.json`.
 */
export interface ICodeGraphyConfig {
  /** Settings schema version */
  version: 1;
  /** Maximum number of files to analyze */
  maxFiles: number;
  /** Glob patterns for files to include */
  include: string[];
  /** Whether to respect .gitignore patterns */
  respectGitignore: boolean;
  /** Whether to show orphan nodes (files with no connections) */
  showOrphans: boolean;
  /** Repo-local custom filter patterns */
  filterPatterns: string[];
  /** How to display bidirectional connections */
  bidirectionalEdges: 'separate' | 'combined';
  /** Repo-local custom filter patterns disabled by the user */
  disabledCustomFilterPatterns: string[];
  /** Plugin-provided filter patterns disabled by the user */
  disabledPluginFilterPatterns: string[];
  /** Workspace-enabled CodeGraphy plugin packages */
  plugins: CodeGraphyWorkspacePluginSettings[];
}
