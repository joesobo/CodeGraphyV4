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

export class WorkspacePipelineLifecycleFacade extends WorkspacePipelineRefreshFacade {
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

function normalizeWorkspaceRelativePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}

function isDirectoryAtOrBelowPath(directoryPath: string, targetPath: string): boolean {
  return directoryPath === targetPath || directoryPath.startsWith(`${targetPath}/`);
}

function removeInvalidatedDiscoveredDirectories(
  directories: readonly string[],
  filePaths: readonly string[],
  workspaceRoot: string,
  toWorkspaceRelativePath: (workspaceRoot: string, filePath: string) => string | undefined,
): string[] {
  const invalidatedPaths = filePaths
    .map(filePath => toWorkspaceRelativePath(workspaceRoot, filePath))
    .filter((filePath): filePath is string => Boolean(filePath))
    .map(normalizeWorkspaceRelativePath)
    .filter(Boolean);

  if (invalidatedPaths.length === 0) {
    return [...directories];
  }

  return directories.filter((directoryPath) => {
    const normalizedDirectory = normalizeWorkspaceRelativePath(directoryPath);
    return !invalidatedPaths.some(invalidatedPath =>
      isDirectoryAtOrBelowPath(normalizedDirectory, invalidatedPath),
    );
  });
}
