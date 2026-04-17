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

export class WorkspacePipelineLifecycleFacade extends WorkspacePipelineRefreshFacade {
  getPluginStatuses(disabledPlugins: Set<string>): IPluginStatus[] {
    this._syncPluginOrder();
    return getWorkspacePipelineStatusList(
      this._registry,
      disabledPlugins,
      this._lastDiscoveredFiles,
      this._lastFileConnections,
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

  override clearCache(): void {
    this._cache = clearWorkspacePipelineStoredCache(
      this._getWorkspaceRoot(),
      (message: string) => {
        console.log(message);
      },
    );
  }

  override invalidateWorkspaceFiles(filePaths: readonly string[]): string[] {
    const workspaceRoot = this._getWorkspaceRoot();
    if (!workspaceRoot || filePaths.length === 0) {
      return [];
    }

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

    if (invalidated.length > 0) {
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
