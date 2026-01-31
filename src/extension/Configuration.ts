/**
 * @fileoverview Type-safe wrapper for CodeGraphy extension settings.
 * Provides typed access to all configuration values with proper defaults.
 * @module extension/Configuration
 */

import * as vscode from 'vscode';

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
  /** Glob patterns for files to exclude */
  exclude: string[];
  /** Whether to respect .gitignore patterns */
  respectGitignore: boolean;
  /** Whether to show orphan nodes (files with no connections) */
  showOrphans: boolean;
  /** List of plugin extension names to enable */
  plugins: string[];
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
   * @default 100
   */
  get maxFiles(): number {
    return this.config.get<number>('maxFiles', 100);
  }

  /**
   * Glob patterns for files to include in analysis.
   * @default ['**\/*']
   */
  get include(): string[] {
    return this.config.get<string[]>('include', ['**/*']);
  }

  /**
   * Glob patterns for files to exclude from analysis.
   * @default DEFAULT_EXCLUDE_PATTERNS
   */
  get exclude(): string[] {
    return this.config.get<string[]>('exclude', [...DEFAULT_EXCLUDE_PATTERNS]);
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
   * List of CodeGraphy plugin extension names to enable.
   * Plugins are VSCode extensions that provide additional language support.
   * @default []
   */
  get plugins(): string[] {
    return this.config.get<string[]>('plugins', []);
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
      exclude: this.exclude,
      respectGitignore: this.respectGitignore,
      showOrphans: this.showOrphans,
      plugins: this.plugins,
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
