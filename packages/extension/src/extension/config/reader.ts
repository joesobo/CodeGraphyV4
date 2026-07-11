/**
 * @fileoverview Type-safe wrapper class for reading CodeGraphy's repo-local settings.
 * @module extension/config/reader
 */

import * as vscode from 'vscode';
import type { CodeGraphyWorkspacePluginSettings } from '@codegraphy-dev/core';
import type { IGroup } from '../../shared/settings/groups';
import { DEFAULT_MAX_FILES } from '../../shared/settings/defaults';
import { getCodeGraphyConfiguration, onDidChangeCodeGraphyConfiguration } from '../repoSettings/current';
import type { ICodeGraphyConfig } from './defaults';
import type { AutoRevealMode } from '../../shared/settings/modes';
import { normalizeAutoRevealMode } from '../../shared/settings/autoReveal';

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
   * @default 1000
   */
  get maxFiles(): number {
    return this.config.get<number>('maxFiles', DEFAULT_MAX_FILES);
  }

  get autoReveal(): AutoRevealMode {
    return normalizeAutoRevealMode(this.config.get<unknown>('autoReveal', true));
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

  get respectFilesExclude(): boolean {
    return this.config.get<boolean>('respectFilesExclude', true);
  }

  /**
   * Whether to show orphan nodes (files with no imports and not imported by others).
   * @default true
   */
  get showOrphans(): boolean {
    return this.config.get<boolean>('showOrphans', true);
  }

  get filterPatterns(): string[] {
    return this.config.get<string[]>('filterPatterns', []);
  }

  /**
   * How to display bidirectional connections.
   * @default 'separate'
   */
  get bidirectionalEdges(): 'separate' | 'combined' {
    return this.config.get<'separate' | 'combined'>('bidirectionalEdges', 'separate');
  }

  get disabledCustomFilterPatterns(): string[] {
    return this.config.get<string[]>('disabledCustomFilterPatterns', []);
  }

  get disabledPluginFilterPatterns(): string[] {
    return this.config.get<string[]>('disabledPluginFilterPatterns', []);
  }

  get plugins(): CodeGraphyWorkspacePluginSettings[] {
    return this.config.get<CodeGraphyWorkspacePluginSettings[]>('plugins', []);
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
      autoReveal: this.autoReveal,
      version: 1,
      maxFiles: this.maxFiles,
      include: this.include,
      respectGitignore: this.respectGitignore,
      respectFilesExclude: this.respectFilesExclude,
      showOrphans: this.showOrphans,
      filterPatterns: this.filterPatterns,
      bidirectionalEdges: this.bidirectionalEdges,
      disabledCustomFilterPatterns: this.disabledCustomFilterPatterns,
      disabledPluginFilterPatterns: this.disabledPluginFilterPatterns,
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
    return onDidChangeCodeGraphyConfiguration((event) => {
      if (event.affectsConfiguration(this._section)) {
        callback();
      }
    });
  }
}
