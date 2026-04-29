import * as vscode from 'vscode';
import type { IProjectedConnection } from '../../../core/plugins/types/contracts';
import type { IGraphData } from '../../../shared/graph/contracts';
import type { IPluginFilterPatternGroup } from '../../../shared/protocol/extensionToWebview';
import {
  getWorkspacePipelinePluginFilterGroups,
  getWorkspacePipelinePluginFilterPatterns,
  initializeWorkspacePipeline,
} from '../plugins/bootstrap';
import type { WorkspacePipelineSourceOwner } from '../analysisSource';
import { WorkspacePipelineInternalBase } from './base/internal';
import {
  createWorkspacePipelineDiscoveryDependencies,
  discoverWorkspacePipelineFilesWithWarnings,
} from './runtime/discovery';
import { hasWorkspacePipelineIndex } from './cache/index';
import {
  analyzeWorkspacePipeline,
  rebuildWorkspacePipelineGraph,
} from './runtime/run';
import { evaluateCodeGraphyIndexStatus } from '../../repoSettings/freshness';
import { readCodeGraphyRepoMeta } from '../../repoSettings/meta';

export abstract class WorkspacePipelineDiscoveryFacade extends WorkspacePipelineInternalBase {
  async initialize(): Promise<void> {
    await initializeWorkspacePipeline(this._registry, {
      getWorkspaceRoot: () => this._getWorkspaceRoot(),
    });

    console.log('[CodeGraphy] WorkspacePipeline initialized');
  }

  getPluginFilterPatterns(
    disabledPlugins: ReadonlySet<string> = new Set(),
  ): string[] {
    return getWorkspacePipelinePluginFilterPatterns(this._registry, disabledPlugins);
  }

  getPluginFilterGroups(
    disabledPlugins: ReadonlySet<string> = new Set(),
  ): IPluginFilterPatternGroup[] {
    return getWorkspacePipelinePluginFilterGroups(this._registry, disabledPlugins);
  }

  private _getEffectiveCustomFilterPatterns(filterPatterns: string[]): string[] {
    const disabledPatterns = new Set(this._config.disabledCustomFilterPatterns);
    return filterPatterns.filter(pattern => !disabledPatterns.has(pattern));
  }

  private _getEffectivePluginFilterPatterns(disabledPlugins: ReadonlySet<string>): string[] {
    const disabledPatterns = new Set(this._config.disabledPluginFilterPatterns);
    return this.getPluginFilterPatterns(disabledPlugins)
      .filter(pattern => !disabledPatterns.has(pattern));
  }

  hasIndex(): boolean {
    return hasWorkspacePipelineIndex(this._getWorkspaceRoot());
  }

  getIndexStatus(): { freshness: 'fresh' | 'stale' | 'missing'; detail: string } {
    const workspaceRoot = this._getWorkspaceRoot();
    if (!workspaceRoot) {
      return {
        freshness: 'missing',
        detail: 'CodeGraphy index is missing. Index the repo to build the graph.',
      };
    }

    if (!this.hasIndex()) {
      return {
        freshness: 'missing',
        detail: 'CodeGraphy index is missing. Index the repo to build the graph.',
      };
    }

    const status = evaluateCodeGraphyIndexStatus({
      meta: readCodeGraphyRepoMeta(workspaceRoot),
      currentCommit: this._getCurrentCommitShaSync(workspaceRoot),
      pluginSignature: this._getPluginSignature(),
      settingsSignature: this._getSettingsSignature(),
    });

    return {
      freshness: status.freshness,
      detail: status.detail,
    };
  }

  async discoverGraph(
    filterPatterns: string[] = [],
    disabledPlugins: Set<string> = new Set(),
    signal?: AbortSignal,
  ): Promise<IGraphData> {
    this._syncPluginOrder();
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

    this._lastDiscoveredFiles = discoveryResult.files;
    this._lastFileAnalysis = new Map();
    this._lastFileConnections = fileConnections;
    this._lastWorkspaceRoot = workspaceRoot;

    return this._buildGraphData(
      fileConnections,
      workspaceRoot,
      config.showOrphans,
      disabledPlugins,
    );
  }

  async analyze(
    filterPatterns: string[] = [],
    disabledPlugins: Set<string> = new Set(),
    signal?: AbortSignal,
    onProgress?: (progress: { phase: string; current: number; total: number }) => void,
  ): Promise<IGraphData> {
    this._syncPluginOrder();
    return analyzeWorkspacePipeline(
      this as unknown as WorkspacePipelineSourceOwner,
      this._cache,
      this._config,
      this._discovery,
      () => this._getWorkspaceRoot(),
      this._getEffectiveCustomFilterPatterns(filterPatterns),
      disabledPlugins,
      onProgress,
      signal,
      async () => this._persistIndexMetadata(),
    );
  }

  rebuildGraph(disabledPlugins: Set<string>, showOrphans: boolean): IGraphData {
    this._syncPluginOrder();
    return rebuildWorkspacePipelineGraph(
      this as unknown as WorkspacePipelineSourceOwner,
      disabledPlugins,
      showOrphans,
    );
  }

  async refreshIndex(
    filterPatterns: string[] = [],
    disabledPlugins: Set<string> = new Set(),
    signal?: AbortSignal,
    onProgress?: (progress: { phase: string; current: number; total: number }) => void,
  ): Promise<IGraphData> {
    this.clearCache();
    return this.analyze(filterPatterns, disabledPlugins, signal, progress => {
      onProgress?.({
        ...progress,
        phase: 'Refreshing Index',
      });
    });
  }

  abstract clearCache(): void;
}
