/**
 * @fileoverview Type-safe wrapper class for reading CodeGraphy's repo-local settings.
 * @module extension/config/reader
 */

import * as vscode from 'vscode';
import type { IGroup } from '../../shared/settings/groups';
import { getCodeGraphyConfiguration, onDidChangeCodeGraphyConfiguration } from '../repoSettings/current';
import type { ICodeGraphyConfig } from './defaults';

interface CodeGraphyConfigurationLike {
  get<T>(key: string, defaultValue: T): T;
}

/**
 * Type-safe wrapper for accessing CodeGraphy extension settings.
 *
 * This class provides methods to read configuration values with proper
 * type checking and default values. It reads from CodeGraphy's repo-local
 * settings store.
 *
 * @example
 * ```typescript
 * const config = new Configuration();
 * const maxFiles = config.maxFiles; // number
 * const patterns = config.get('filterPatterns', []);  // string[]
 *
 * // Or get all settings at once
 * const all = config.getAll();
 * ```
 */
export class Configuration {
  private readonly _section = 'codegraphy';

  /**
   * Gets the repo-local CodeGraphy configuration.
   */
  private get config(): CodeGraphyConfigurationLike {
    return getCodeGraphyConfiguration();
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
   * Plugin toggle state persisted in repo-local settings.
   * Entries are plugin IDs (e.g., "codegraphy.typescript").
   * @default []
   */
  get disabledPlugins(): string[] {
    return this.config.get<string[]>('disabledPlugins', []);
  }

  /**
   * Plugin processing order, highest priority first.
   * @default []
   */
  get pluginOrder(): string[] {
    return this.config.get<string[]>('pluginOrder', []);
  }

  get disabledCustomFilterPatterns(): string[] {
    return this.config.get<string[]>('disabledCustomFilterPatterns', []);
  }

  get disabledPluginFilterPatterns(): string[] {
    return this.config.get<string[]>('disabledPluginFilterPatterns', []);
  }

  /**
   * Maximum number of commits to index for the timeline.
   * @default 500
   */
  get timelineMaxCommits(): number {
    return this.config.get<number>('timeline.maxCommits', 500);
  }

  get legend(): IGroup[] {
    return this.config.get<IGroup[]>('legend', []);
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
      disabledPlugins: this.disabledPlugins,
      pluginOrder: this.pluginOrder,
      disabledCustomFilterPatterns: this.disabledCustomFilterPatterns,
      disabledPluginFilterPatterns: this.disabledPluginFilterPatterns,
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
    return onDidChangeCodeGraphyConfiguration((event) => {
      if (event.affectsConfiguration(this._section)) {
        callback();
      }
    });
  }
}
