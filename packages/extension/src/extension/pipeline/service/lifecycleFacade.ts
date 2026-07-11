import * as vscode from 'vscode';
import type { IPluginStatus } from '../../../shared/plugins/status';
import { WorkspacePipelineRefreshFacade } from './refreshFacade';
import { clearWorkspacePipelineStoredCache } from './cache/storage';
import {
  invalidateWorkspacePipelineFiles,
  resolveWorkspacePipelinePluginFilePaths,
} from './cache/invalidation';
import {
  getWorkspacePipelinePluginName,
  getWorkspacePipelineStatusList,
} from './runtime/plugins';
import { readWorkspacePluginStatusContext } from '../plugins/statusContext';
import { removeInvalidatedDiscoveredDirectories } from './directoryInvalidation';

export class WorkspacePipelineLifecycleFacade extends WorkspacePipelineRefreshFacade {
  getFilesExcludedCount(): number {
    return this._lastFilesExcludedCount;
  }

  getRespectFilesExclude(): boolean {
    return this._config.getAll().respectFilesExclude;
  }

  getPluginStatuses(disabledPlugins: Set<string>): IPluginStatus[] {
    const pluginStatusContext = readWorkspacePluginStatusContext(this._getWorkspaceRoot());
    return getWorkspacePipelineStatusList(
      this._registry,
      disabledPlugins,
      this._lastDiscoveredFiles,
      this._lastFileConnections,
      pluginStatusContext,
    );
  }

  getPluginNameForFile(relativePath: string): string | undefined {
    return getWorkspacePipelinePluginName(
      relativePath,
      this._lastWorkspaceRoot,
      this._registry,
      vscode.workspace.workspaceFolders,
    );
  }

  getPluginNamesForIds(pluginIds: readonly string[]): string[] {
    if (pluginIds.length === 0) {
      return [];
    }

    const requestedPluginIds = new Set(pluginIds);
    const namesByPluginId = new Map(
      this._registry
        .list()
        .filter(({ plugin }) => requestedPluginIds.has(plugin.id))
        .map(({ plugin }) => [plugin.id, plugin.name]),
    );

    return pluginIds
      .map(pluginId => namesByPluginId.get(pluginId))
      .filter((pluginName): pluginName is string => Boolean(pluginName));
  }

  override clearCache(): void {
    this._cache = clearWorkspacePipelineStoredCache(
      this._getWorkspaceRoot(),
      (message: string) => {
        console.log(message);
      },
    );
  }

  override invalidateWorkspaceFiles(
    filePaths: readonly string[],
    options: { persist?: boolean } = {},
  ): string[] {
    const workspaceRoot = this._getWorkspaceRoot();
    if (!workspaceRoot || filePaths.length === 0) {
      return [];
    }

    this._lastDiscoveredDirectories = removeInvalidatedDiscoveredDirectories(
      this._lastDiscoveredDirectories,
      filePaths,
      workspaceRoot,
      (root, filePath) => this._toWorkspaceRelativePath(root, filePath),
    );

    const invalidated = invalidateWorkspacePipelineFiles(
      {
        cache: this._cache,
        lastFileAnalysis: this._lastFileAnalysis,
        lastFileConnections: this._lastFileConnections,
      },
      workspaceRoot,
      filePaths,
      (root, filePath) => this._toWorkspaceRelativePath(root, filePath),
    );

    if (invalidated.length > 0 && options.persist !== false) {
      this._persistCache();
    }

    return invalidated;
  }

  invalidatePluginFiles(pluginIds: readonly string[]): string[] {
    if (pluginIds.length === 0 || this._lastDiscoveredFiles.length === 0) {
      return [];
    }

    const selectedPluginIds = new Set(pluginIds);
    const pluginInfos = this._registry
      .list()
      .filter(({ plugin }) => selectedPluginIds.has(plugin.id));
    if (pluginInfos.length === 0) {
      return [];
    }

    const absolutePaths = resolveWorkspacePipelinePluginFilePaths(
      this._lastWorkspaceRoot,
      this._lastDiscoveredFiles,
      pluginInfos,
    );

    return this.invalidateWorkspaceFiles(absolutePaths);
  }

  dispose(): void {
    this._registry.disposeAll();
  }
}

export { WorkspacePipelineLifecycleFacade as WorkspacePipeline };
