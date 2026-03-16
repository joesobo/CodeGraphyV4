/**
 * @fileoverview Type-safe wrapper for CodeGraphy extension settings.
 * Provides typed access to all configuration values with proper defaults.
 * @module extension/Configuration
 */

import * as vscode from 'vscode';
import type { IGroup } from '../shared/types';

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
  '**/coverage/**',
  '**/*.min.js',
  '**/*.bundle.js',
  '**/*.map',
];

/**
 * Configuration interface matching the settings defined in package.json.
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
  /** List of disabled rule qualified IDs */
  disabledRules: string[];
  /** List of disabled plugin IDs */
  disabledPlugins: string[];
}

/**
 * Type-safe wrapper for accessing CodeGraphy extension settings.
 * 
 * This class provides methods to read configuration values with proper
 * type checking and default values. It reads from VSCode's workspace
 * configuration under the 'codegraphy' section.
 * 
 * @example
 * ```typescript
 * const config = new Configuration();
 * const maxFiles = config.maxFiles; // number
 * const patterns = config.exclude;  // string[]
 * 
 * // Or get all settings at once
 * const all = config.getAll();
 * ```
 */
export class Configuration {
  private readonly _section = 'codegraphy';

  /**
   * Gets the VSCode workspace configuration for CodeGraphy.
   */
  private get config(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(this._section);
  }

  /**
   * Maximum number of files to analyze.
   * Shows a warning if the workspace exceeds this limit.
   * @default 500
   */
  get maxFiles(): number {
    return this.config.get<number>('maxFiles', 500);
  }

  /**
   * Glob patterns for files to include in analysis.
   * @default ['**\/*']
   */
  get include(): string[] {
    return this.config.get<string[]>('include', ['**/*']);
  }

  /**
   * Whether to also exclude files matched by .gitignore.
   * @default true
   */
  get respectGitignore(): boolean {
    return this.config.get<boolean>('respectGitignore', true);
  }

  /**
   * Whether to show orphan nodes (files with no imports and not imported by others).
   * @default true
   */
  get showOrphans(): boolean {
    return this.config.get<boolean>('showOrphans', true);
  }

  /**
   * How to display bidirectional connections.
   * @default 'separate'
   */
  get bidirectionalEdges(): 'separate' | 'combined' {
    return this.config.get<'separate' | 'combined'>('bidirectionalEdges', 'separate');
  }

  /**
   * List of CodeGraphy plugin extension names to enable.
   * Plugins are VSCode extensions that provide additional language support.
   * @default []
   */
  get plugins(): string[] {
    return this.config.get<string[]>('plugins', []);
  }

  /**
   * Rule toggle state persisted in VS Code settings.
   * Entries are qualified IDs in "<pluginId>:<ruleId>" format.
   * @default []
   */
  get disabledRules(): string[] {
    return this.config.get<string[]>('disabledRules', []);
  }

  /**
   * Plugin toggle state persisted in VS Code settings.
   * Entries are plugin IDs (e.g., "codegraphy.typescript").
   * @default []
   */
  get disabledPlugins(): string[] {
    return this.config.get<string[]>('disabledPlugins', []);
  }

  /**
   * Maximum number of commits to index for the timeline.
   * @default 500
   */
  get timelineMaxCommits(): number {
    return this.config.get<number>('timeline.maxCommits', 500);
  }

  /**
   * User-defined groups with pattern, color, shape, and image settings.
   * @default []
   */
  get groups(): IGroup[] {
    return this.config.get<IGroup[]>('groups', []);
  }

  /**
   * Timeline playback speed multiplier.
   * @default 1.0
   */
  get timelinePlaybackSpeed(): number {
    return this.config.get<number>('timeline.playbackSpeed', 1.0);
  }

  /**
   * Gets a configuration value by key with a default.
   * @param key - Configuration key (without 'codegraphy.' prefix)
   * @param defaultValue - Default value if not set
   * @returns The configuration value or default
   */
  get<T>(key: string, defaultValue: T): T {
    return this.config.get<T>(key, defaultValue);
  }

  /**
   * Gets all configuration values as a single object.
   * Useful for passing configuration to other modules.
   * 
   * @returns Complete configuration object with all settings
   */
  getAll(): ICodeGraphyConfig {
    return {
      maxFiles: this.maxFiles,
      include: this.include,
      respectGitignore: this.respectGitignore,
      showOrphans: this.showOrphans,
      bidirectionalEdges: this.bidirectionalEdges,
      plugins: this.plugins,
      disabledRules: this.disabledRules,
      disabledPlugins: this.disabledPlugins,
    };
  }

  /**
   * Registers a listener for configuration changes.
   * The callback is invoked whenever any CodeGraphy setting changes.
   * 
   * @param callback - Function to call when configuration changes
   * @returns Disposable that can be used to unregister the listener
   * 
   * @example
   * ```typescript
   * const config = new Configuration();
   * const disposable = config.onDidChange(() => {
   *   console.log('Config changed, re-analyzing...');
   *   analyzer.refresh();
   * });
   * context.subscriptions.push(disposable);
   * ```
   */
  onDidChange(callback: () => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(this._section)) {
        callback();
      }
    });
  }
}
