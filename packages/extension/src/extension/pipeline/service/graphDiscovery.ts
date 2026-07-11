import * as vscode from 'vscode';
import type { IGraphData } from '../../../shared/graph/contracts';
import type { IProjectedConnection } from '../../../core/plugins/types/contracts';
import { WorkspacePipelinePluginFacade } from './pluginFacade';
import {
  createWorkspacePipelineDiscoveryDependencies,
  discoverWorkspacePipelineFilesWithWarnings,
} from './runtime/discovery';
import { readFilesExcludeRules } from '../../config/filesExclude/model';

export abstract class WorkspacePipelineGraphDiscoveryFacade extends WorkspacePipelinePluginFacade {
  async discoverGraph(
    filterPatterns: string[] = [],
    disabledPlugins: Set<string> = new Set(),
    signal?: AbortSignal,
  ): Promise<IGraphData> {
    const workspaceRoot = this._getWorkspaceRoot();
    if (!workspaceRoot) {
      console.log('[CodeGraphy] No workspace folder open');
      return { nodes: [], edges: [] };
    }

    const config = this._config.getAll();
    const workspaceResource = vscode.workspace.workspaceFolders
      ?.find(folder => folder.uri.fsPath === workspaceRoot)?.uri;
    const discoveryConfig = {
      ...config,
      filesExclude: config.respectFilesExclude && workspaceResource
        ? readFilesExcludeRules(vscode.workspace, workspaceResource)
        : [],
    };
    const discoveryResult = await discoverWorkspacePipelineFilesWithWarnings(
      createWorkspacePipelineDiscoveryDependencies(this._discovery),
      workspaceRoot,
      discoveryConfig,
      this._getEffectiveCustomFilterPatterns(filterPatterns),
      this._getEffectivePluginFilterPatterns(disabledPlugins),
      signal,
      message => {
        vscode.window.showWarningMessage(message);
      },
    );
    const fileConnections = new Map<string, IProjectedConnection[]>(
      discoveryResult.files.map(file => [file.relativePath, []]),
    );

    this._lastDiscoveredDirectories = discoveryResult.directories ?? [];
    this._lastDiscoveredFiles = discoveryResult.files;
    this._lastGitIgnoredPaths = discoveryResult.gitIgnoredPaths ?? [];
    this._lastFilesExcludedCount = discoveryResult.filesExcludedCount ?? 0;
    this._lastFileAnalysis = new Map();
    this._lastFileConnections = fileConnections;
    this._lastWorkspaceRoot = workspaceRoot;

    return this._buildGraphData(
      fileConnections,
      workspaceRoot,
      true,
      disabledPlugins,
    );
  }
}
