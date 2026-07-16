import type * as vscode from 'vscode';
import type { AnalysisCacheTier } from '@codegraphy-dev/core';
import {
  readWorkspaceAnalysisDatabaseSnapshot,
  type WorkspaceAnalysisDatabaseSnapshot,
} from '../../database/cache/storage';
import { WorkspacePipelineEngineStateBase } from '../../indexingState/model';
import { DEFAULT_GRAPH_CACHE_HYDRATION_TIERS } from '../../cacheHydration/tiers';
import { WorkspacePipelineCacheHydrator } from '../../cacheHydration/runtime';

export interface WorkspacePipelineGraphCacheHydrationOptions {
  activeAnalysisCacheTiers?: readonly AnalysisCacheTier[];
}

export abstract class WorkspacePipelineStateBase extends WorkspacePipelineEngineStateBase {
  private readonly cacheHydrator = new WorkspacePipelineCacheHydrator();

  constructor(context: vscode.ExtensionContext) {
    super(context);
  }

  async warmGraphCache(): Promise<void> {
    await this._hydrateCacheFromGraphCache({
      activeAnalysisCacheTiers: DEFAULT_GRAPH_CACHE_HYDRATION_TIERS,
    });
  }

  readStructuredAnalysisSnapshot(): WorkspaceAnalysisDatabaseSnapshot {
    const workspaceRoot = this._getWorkspaceRoot();
    return workspaceRoot
      ? readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot)
      : { files: [], symbols: [], relations: [] };
  }

  protected async _hydrateCacheFromGraphCache(
    options: WorkspacePipelineGraphCacheHydrationOptions = {},
  ): Promise<void> {
    const workspaceRoot = this._getWorkspaceRoot();
    if (!workspaceRoot) return;
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
