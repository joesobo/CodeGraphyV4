import * as vscode from 'vscode';
import type {
  IProjectedConnection,
  IFileAnalysisResult,
} from '../../../../core/plugins/types/contracts';
import type { IGraphData } from '../../../../shared/graph/contracts';
import type { IDiscoveredFile } from '@codegraphy-dev/core';
import { preAnalyzeCoreTreeSitterFiles } from '@codegraphy-dev/core';
import type { IWorkspaceFileAnalysisResult } from '../../fileAnalysis';
import { readWorkspacePipelineFileStat, readWorkspacePipelineRoot } from '../../serviceAdapters';
import {
  buildWorkspacePipelineCompleteGraphDataFromAnalysis,
  buildWorkspacePipelineGraph,
  buildWorkspacePipelineGraphFromAnalysis,
} from '../runtime/graph';
import { persistWorkspacePipelineIndexMetadata } from '../cache/index';
import {
  readWorkspacePipelineAnalysisFiles,
  toWorkspaceRelativePath,
} from '../cache/paths';
import { createWorkspacePipelineAnalysisCacheTiers } from '../cache/tiers';
import {
  readWorkspacePipelineCurrentCommitSha,
  readWorkspacePipelineCurrentCommitShaSync,
} from '../../cacheSignatures/commit';
import { createWorkspacePipelinePluginSignature } from '../../cacheSignatures/plugin';
import { createWorkspacePipelineSettingsSignature } from '../../cacheSignatures/settings';
import {
  patchWorkspacePipelineCache,
  persistWorkspacePipelineCache,
  type WorkspacePipelineCachePatch,
} from '../cache/storage';
import {
  analyzeWorkspacePipelineDiscoveredFiles,
  preAnalyzeWorkspacePipelinePlugins,
} from '../runtime/analysis';
import { WorkspacePipelineStateBase } from './state';
import { listActiveAnalysisPluginIds } from '../../pluginAnalysis/selection';

export abstract class WorkspacePipelineInternalBase extends WorkspacePipelineStateBase {
  protected _completeGraphData: IGraphData = { nodes: [], edges: [] };

  protected async _preAnalyzePlugins(
    files: IDiscoveredFile[],
    workspaceRoot: string,
    signal?: AbortSignal,
    disabledPlugins: Set<string> = new Set(),
  ): Promise<void> {
    await preAnalyzeWorkspacePipelinePlugins(
      files,
      workspaceRoot,
      {
        notifyPreAnalyze: async (v2Files, rootPath) => {
          await preAnalyzeCoreTreeSitterFiles(v2Files, rootPath);
          await this._registry.notifyPreAnalyze(
            v2Files,
            rootPath,
            undefined,
            disabledPlugins,
          );
        },
        readContent: file => this._discovery.readContent(file),
      },
      signal,
      disabledPlugins,
    );
  }

  protected async _analyzeFiles(
    files: IDiscoveredFile[],
    workspaceRoot: string,
    onProgress?: (progress: { current: number; total: number; filePath: string }) => void,
    signal?: AbortSignal,
    pluginCacheTierIds?: readonly string[],
    disabledPlugins: Set<string> = new Set(),
    options?: { forceAnalyze?: boolean },
  ): Promise<IWorkspaceFileAnalysisResult> {
    const analysisPluginIds = this._getActiveAnalysisPluginIds(
      pluginCacheTierIds,
      disabledPlugins,
    );

    const analysisCacheTiers = createWorkspacePipelineAnalysisCacheTiers(
      analysisPluginIds,
    );

    return options
      ? analyzeWorkspacePipelineDiscoveredFiles(
          this._cache,
          this._discovery,
          this._eventBus,
          this._registry,
          (filePath: string) => this._getFileStat(filePath),
          files,
          workspaceRoot,
          onProgress,
          signal,
          analysisCacheTiers,
          analysisPluginIds,
          disabledPlugins,
          options,
        )
      : analyzeWorkspacePipelineDiscoveredFiles(
          this._cache,
          this._discovery,
          this._eventBus,
          this._registry,
          (filePath: string) => this._getFileStat(filePath),
          files,
          workspaceRoot,
          onProgress,
          signal,
          analysisCacheTiers,
          analysisPluginIds,
          disabledPlugins,
        );
  }

  protected _getActiveAnalysisPluginIds(
    pluginIds: readonly string[] | undefined,
    disabledPlugins: ReadonlySet<string>,
  ): string[] {
    return listActiveAnalysisPluginIds(this._registry, pluginIds, disabledPlugins);
  }

  protected _buildGraphData(
    fileConnections: Map<string, IProjectedConnection[]>,
    workspaceRoot: string,
    showOrphans: boolean,
    disabledPlugins: Set<string> = new Set(),
  ): IGraphData {
    const graphData = buildWorkspacePipelineGraph(
      this._cache,
      this._registry,
      fileConnections,
      workspaceRoot,
      showOrphans,
      disabledPlugins,
      this._lastDiscoveredDirectories,
      this._lastGitIgnoredPaths,
    );
    this._completeGraphData = graphData;
    this._lastGraphData = graphData;
    return graphData;
  }

  protected _buildGraphDataFromAnalysis(
    fileAnalysis: Map<string, IFileAnalysisResult>,
    workspaceRoot: string,
    showOrphans: boolean,
    disabledPlugins: Set<string> = new Set(),
  ): IGraphData {
    const completeGraphData = buildWorkspacePipelineCompleteGraphDataFromAnalysis(
      this._cache,
      this._registry,
      fileAnalysis,
      workspaceRoot,
      showOrphans,
      disabledPlugins,
      this._lastDiscoveredDirectories,
      this._lastGitIgnoredPaths,
    );
    const nodeVisibility = this._config.get<Record<string, boolean>>('nodeVisibility', {}) ?? {};
    const graphData = buildWorkspacePipelineGraphFromAnalysis(
      this._cache,
      this._registry,
      fileAnalysis,
      workspaceRoot,
      showOrphans,
      disabledPlugins,
      this._lastDiscoveredDirectories,
      { nodeVisibility },
      this._lastGitIgnoredPaths,
    );
    this._completeGraphData = completeGraphData;
    this._lastGraphData = graphData;
    return graphData;
  }

  protected _getWorkspaceRoot(): string | undefined {
    return readWorkspacePipelineRoot(vscode.workspace.workspaceFolders);
  }

  protected async _getFileStat(filePath: string): Promise<{ mtime: number; size: number } | null> {
    return readWorkspacePipelineFileStat(filePath, vscode.workspace.fs);
  }

  protected _getPluginSignature(): string | null {
    return createWorkspacePipelinePluginSignature(this._registry.list(), {
      settings: this._config.getAll(),
    });
  }

  protected _getSettingsSignature(): string {
    return createWorkspacePipelineSettingsSignature(this._config);
  }

  protected async _getCurrentCommitSha(workspaceRoot: string): Promise<string | null> {
    return readWorkspacePipelineCurrentCommitSha(workspaceRoot);
  }

  protected _getCurrentCommitShaSync(workspaceRoot: string): string | null {
    return readWorkspacePipelineCurrentCommitShaSync(workspaceRoot);
  }

  protected _toWorkspaceRelativePath(
    workspaceRoot: string,
    filePath: string,
  ): string | undefined {
    return toWorkspaceRelativePath(workspaceRoot, filePath);
  }

  protected async _readAnalysisFiles(
    files: IDiscoveredFile[],
  ): Promise<Array<{ absolutePath: string; relativePath: string; content: string }>> {
    return readWorkspacePipelineAnalysisFiles(
      files,
      file => this._discovery.readContent(file),
    );
  }

  protected async _persistIndexMetadata(): Promise<void> {
    const workspaceRoot = this._getWorkspaceRoot();
    await persistWorkspacePipelineIndexMetadata(workspaceRoot, {
      getCurrentCommitSha: () =>
        workspaceRoot ? this._getCurrentCommitShaSync(workspaceRoot) : null,
      getPluginSignature: () => this._getPluginSignature(),
      getSettingsSignature: () => this._getSettingsSignature(),
      warn: (message: string, error: unknown) => {
        console.warn(message, error);
      },
    });
  }

  protected _persistCache(): void {
    persistWorkspacePipelineCache(
      this._getWorkspaceRoot(),
      this._cache,
      this._completeGraphData,
      (message: string, error: unknown) => {
        console.warn(message, error);
      },
    );
  }

  protected _persistCachePatch(patch: WorkspacePipelineCachePatch): void {
    patchWorkspacePipelineCache(
      this._getWorkspaceRoot(),
      this._cache,
      patch,
      (message: string, error: unknown) => {
        console.warn(message, error);
      },
    );
  }
}
