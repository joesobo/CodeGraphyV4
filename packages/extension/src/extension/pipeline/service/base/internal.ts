import * as vscode from 'vscode';
import type {
  IProjectedConnection,
  IFileAnalysisResult,
} from '../../../../core/plugins/types/contracts';
import type { IGraphData } from '../../../../shared/graph/contracts';
import type { IDiscoveredFile } from '../../../../core/discovery/contracts';
import type { IWorkspaceFileAnalysisResult } from '../../fileAnalysis';
import { readWorkspacePipelineFileStat, readWorkspacePipelineRoot } from '../../serviceAdapters';
import {
  buildWorkspacePipelineGraph,
  buildWorkspacePipelineGraphFromAnalysis,
} from '../runtime/graph';
import { persistWorkspacePipelineIndexMetadata } from '../cache/index';
import {
  readWorkspacePipelineAnalysisFiles,
  toWorkspaceRelativePath,
} from '../cache/paths';
import {
  createWorkspacePipelinePluginSignature,
  createWorkspacePipelineSettingsSignature,
  readWorkspacePipelineCurrentCommitSha,
  readWorkspacePipelineCurrentCommitShaSync,
} from '../cache/signatures';
import { persistWorkspacePipelineCache } from '../cache/storage';
import {
  analyzeWorkspacePipelineDiscoveredFiles,
  preAnalyzeWorkspacePipelinePlugins,
} from '../runtime/analysis';
import { WorkspacePipelineStateBase } from './state';

export abstract class WorkspacePipelineInternalBase extends WorkspacePipelineStateBase {
  protected async _preAnalyzePlugins(
    files: IDiscoveredFile[],
    workspaceRoot: string,
    signal?: AbortSignal,
  ): Promise<void> {
    await preAnalyzeWorkspacePipelinePlugins(
      files,
      workspaceRoot,
      {
        notifyPreAnalyze: async (v2Files, rootPath) => {
          await this._registry.notifyPreAnalyze(v2Files, rootPath);
        },
        readContent: file => this._discovery.readContent(file),
      },
      signal,
    );
  }

  protected async _analyzeFiles(
    files: IDiscoveredFile[],
    workspaceRoot: string,
    onProgress?: (progress: { current: number; total: number; filePath: string }) => void,
    signal?: AbortSignal,
  ): Promise<IWorkspaceFileAnalysisResult> {
    return analyzeWorkspacePipelineDiscoveredFiles(
      this._cache,
      this._discovery,
      this._eventBus,
      this._registry,
      (filePath: string) => this._getFileStat(filePath),
      files,
      workspaceRoot,
      onProgress,
      signal,
    );
  }

  protected _buildGraphData(
    fileConnections: Map<string, IProjectedConnection[]>,
    workspaceRoot: string,
    showOrphans: boolean,
    disabledPlugins: Set<string> = new Set(),
  ): IGraphData {
    return buildWorkspacePipelineGraph(
      this._cache,
      this._context,
      this._registry,
      fileConnections,
      workspaceRoot,
      showOrphans,
      disabledPlugins,
    );
  }

  protected _buildGraphDataFromAnalysis(
    fileAnalysis: Map<string, IFileAnalysisResult>,
    workspaceRoot: string,
    showOrphans: boolean,
    disabledPlugins: Set<string> = new Set(),
  ): IGraphData {
    return buildWorkspacePipelineGraphFromAnalysis(
      this._cache,
      this._context,
      this._registry,
      fileAnalysis,
      workspaceRoot,
      showOrphans,
      disabledPlugins,
    );
  }

  protected _getWorkspaceRoot(): string | undefined {
    return readWorkspacePipelineRoot(vscode.workspace.workspaceFolders);
  }

  protected async _getFileStat(filePath: string): Promise<{ mtime: number; size: number } | null> {
    return readWorkspacePipelineFileStat(filePath, vscode.workspace.fs);
  }

  protected _syncPluginOrder(): void {
    this._registry.setPluginOrder(this._config.getAll().pluginOrder);
  }

  protected _getPluginSignature(): string | null {
    return createWorkspacePipelinePluginSignature(this._registry.list());
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
    await persistWorkspacePipelineIndexMetadata(this._getWorkspaceRoot(), {
      getCurrentCommitSha: async workspaceRoot => this._getCurrentCommitSha(workspaceRoot),
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
      (message: string, error: unknown) => {
        console.warn(message, error);
      },
    );
  }
}
