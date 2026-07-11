/**
 * @fileoverview Configuration defaults and types for CodeGraphy's repo-local settings.
 * @module extension/config/defaults
 */

import {
  DEFAULT_EXCLUDE,
  type CodeGraphyWorkspacePluginSettings,
} from '@codegraphy-dev/core';
import type { AutoRevealMode } from '../../shared/settings/modes';

/**
 * Default exclude patterns for file discovery.
 * Aliased from core discovery so extension settings and indexing use the same
 * build artifact, dependency, and non-source file defaults.
 */
export const DEFAULT_EXCLUDE_PATTERNS: readonly string[] = DEFAULT_EXCLUDE;

/**
 * Configuration interface matching the settings persisted under `.codegraphy/settings.json`.
 */
export interface ICodeGraphyConfig {
  /** Whether active editors select and optionally pan to their graph node. */
  autoReveal: AutoRevealMode;
  /** Settings schema version */
  version: 1;
  /** Maximum number of files to analyze */
  maxFiles: number;
  /** Glob patterns for files to include */
  include: string[];
  /** Whether to respect .gitignore patterns */
  respectGitignore: boolean;
  /** Whether to respect VS Code's resource-scoped files.exclude rules. */
  respectFilesExclude: boolean;
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
