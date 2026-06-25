import * as vscode from 'vscode';
import type { IGraphData } from '../../../shared/graph/contracts';
import type { IProjectedConnection } from '../../../core/plugins/types/contracts';
import { WorkspacePipelinePluginFacade } from './pluginFacade';
import {
  createWorkspacePipelineDiscoveryDependencies,
  discoverWorkspacePipelineFilesWithWarnings,
} from './runtime/discovery';

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
    const discoveryResult = await discoverWorkspacePipelineFilesWithWarnings(
      createWorkspacePipelineDiscoveryDependencies(this._discovery),
      workspaceRoot,
      config,
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
