/**
 * @fileoverview Type-safe wrapper class for reading CodeGraphy extension settings.
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
   * List of CodeGraphy plugin extension names to enable.
   * Plugins are VSCode extensions that provide additional language support.
   * @default []
   */
  get plugins(): string[] {
    return this.config.get<string[]>('plugins', []);
  }

  /**
   * Rule toggle state persisted in VS Code settings.
   * Entries are qualified IDs in "<pluginId>:<sourceId>" format.
   * @default []
   */
  get disabledSources(): string[] {
    return this.config.get<string[]>('disabledSources', []);
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
      disabledSources: this.disabledSources,
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
    return onDidChangeCodeGraphyConfiguration((event) => {
      if (event.affectsConfiguration(this._section)) {
        callback();
      }
    });
  }
}
