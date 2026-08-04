import type * as vscode from 'vscode';
import type { AnalysisCacheTier, WorkspaceIndexEngineState } from '@codegraphy-dev/core';
import type { IGraphData } from '../../../../shared/graph/contracts';
import {
  readWorkspaceAnalysisDatabaseSnapshot,
  type WorkspaceAnalysisDatabaseSnapshot,
} from '../../database/cache/storage';
import { WorkspacePipelineEngineStateBase } from '../../indexingState/model';
import { DEFAULT_GRAPH_CACHE_HYDRATION_TIERS } from '../../cacheHydration/tiers';
import { WorkspacePipelineCacheHydrator } from '../../cacheHydration/runtime';

export interface WorkspacePipelineGraphCacheHydrationOptions {
  activeAnalysisCacheTiers?: readonly AnalysisCacheTier[];
  forceReload?: boolean;
  preserveAllAnalysisFacts?: boolean;
  rejectUnreadable?: boolean;
}

export interface WorkspacePipelineRefreshState {
  completeGraphData: IGraphData;
  engineState: WorkspaceIndexEngineState;
  recoverableGraphStateWorkspaceRoot?: string;
}

export abstract class WorkspacePipelineStateBase extends WorkspacePipelineEngineStateBase {
  private readonly cacheHydrator = new WorkspacePipelineCacheHydrator();
  protected _completeGraphData: IGraphData = { nodes: [], edges: [] };
  private recoverableGraphStateWorkspaceRoot: string | undefined;

  constructor(context: vscode.ExtensionContext) {
    super(context);
  }

  readStructuredAnalysisSnapshot(): WorkspaceAnalysisDatabaseSnapshot {
    const workspaceRoot = this._getWorkspaceRoot();
    return workspaceRoot
      ? readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot)
      : { files: [], graph: { nodes: [], edges: [] }, symbols: [], relations: [] };
  }

  protected _captureRefreshState(): WorkspacePipelineRefreshState {
    return structuredClone({
      completeGraphData: this._completeGraphData,
      engineState: this._engineState,
      recoverableGraphStateWorkspaceRoot: this.recoverableGraphStateWorkspaceRoot,
    });
  }

  protected _restoreRefreshState(snapshot: WorkspacePipelineRefreshState): void {
    const restored = structuredClone(snapshot);
    this._completeGraphData = restored.completeGraphData;
    this.recoverableGraphStateWorkspaceRoot = restored.recoverableGraphStateWorkspaceRoot;
    Object.assign(this._engineState, restored.engineState);
  }

  protected _markRecoverableGraphState(workspaceRoot: string): void {
    this.recoverableGraphStateWorkspaceRoot = workspaceRoot;
  }

  protected _hasRecoverableGraphState(workspaceRoot: string | undefined): boolean {
    return Boolean(
      workspaceRoot
      && this.recoverableGraphStateWorkspaceRoot === workspaceRoot,
    );
  }

  protected _clearRecoverableGraphState(): void {
    this.recoverableGraphStateWorkspaceRoot = undefined;
  }

  protected async _hydrateCacheFromGraphCache(
    options: WorkspacePipelineGraphCacheHydrationOptions = {},
  ): Promise<void> {
    const workspaceRoot = this._getWorkspaceRoot();
    if (!workspaceRoot) return;
    if (options.preserveAllAnalysisFacts) {
      await this.cacheHydrator.hydrateAll(workspaceRoot, {
        get: () => this._cache,
        set: cache => { this._cache = cache; },
      }, {
        forceReload: options.forceReload,
        rejectUnreadable: options.rejectUnreadable,
      });
      return;
    }
    await this.cacheHydrator.hydrate(
      workspaceRoot,
      options.activeAnalysisCacheTiers ?? DEFAULT_GRAPH_CACHE_HYDRATION_TIERS,
      {
        get: () => this._cache,
        set: cache => { this._cache = cache; },
      },
    );
  }
}
