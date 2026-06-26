import * as vscode from 'vscode';
import type {
  IProjectedConnection,
  IFileAnalysisResult,
} from '../../../../core/plugins/types/contracts';
import { PluginRegistry } from '../../../../core/plugins/registry/manager';
import {
  BASELINE_ANALYSIS_CACHE_TIER,
  createWorkspaceIndexEngineState,
  FileDiscovery,
  hasRequiredAnalysisCacheTiers,
  isAnalysisCacheTier,
  readAnalysisCacheTiers,
  sortAnalysisCacheTiers,
  type AnalysisCacheTier,
  type IDiscoveredFile,
  type WorkspaceIndexEngineState,
} from '@codegraphy-dev/core';
import { Configuration } from '../../../config/reader';
import { EventBus } from '../../../../core/plugins/events/bus';
import type { IWorkspaceAnalysisCache } from '../../cache';
import type { IGraphData } from '../../../../shared/graph/contracts';
import {
  loadWorkspaceAnalysisDatabaseCache,
  readWorkspaceAnalysisDatabaseSnapshot,
  type WorkspaceAnalysisDatabaseSnapshot,
} from '../../database/cache/storage';
import { createWorkspacePipelineInitialCache } from '../cache/initialState';

export interface WorkspacePipelineGraphCacheHydrationOptions {
  activeAnalysisCacheTiers?: readonly AnalysisCacheTier[];
}

function getDefaultGraphCacheHydrationTiers(): readonly AnalysisCacheTier[] {
  return [BASELINE_ANALYSIS_CACHE_TIER];
}

function hasCacheFiles(cache: IWorkspaceAnalysisCache): boolean {
  return Object.keys(cache.files).length > 0;
}

function hasHydratedAnalysisCacheTiers(
  cache: IWorkspaceAnalysisCache,
  tiers: readonly AnalysisCacheTier[],
): boolean {
  return hasCacheFiles(cache)
    && Object.values(cache.files).every(entry =>
      hasRequiredAnalysisCacheTiers(entry.analysis, tiers),
    );
}

function createRuntimeHydrationCacheTiers(
  cache: IWorkspaceAnalysisCache,
  requestedTiers: readonly AnalysisCacheTier[],
): readonly AnalysisCacheTier[] {
  const tiers = new Set<AnalysisCacheTier>([
    BASELINE_ANALYSIS_CACHE_TIER,
    ...requestedTiers,
  ]);
  for (const entry of Object.values(cache.files)) {
    for (const tier of readAnalysisCacheTiers(entry.analysis)) {
      if (isAnalysisCacheTier(tier)) {
        tiers.add(tier);
      }
    }
  }
  return sortAnalysisCacheTiers(tiers);
}

export abstract class WorkspacePipelineStateBase {
  protected readonly _config: Configuration;
  protected readonly _registry: PluginRegistry;
  protected readonly _discovery: FileDiscovery;
  protected readonly _context: vscode.ExtensionContext;
  protected readonly _engineState: WorkspaceIndexEngineState;
  protected _eventBus?: EventBus;
  private _cacheHydrationPromise?: Promise<void>;

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
    this._config = new Configuration();
    this._registry = new PluginRegistry();
    this._discovery = new FileDiscovery();
    this._engineState = createWorkspaceIndexEngineState(
      createWorkspacePipelineInitialCache(vscode.workspace.workspaceFolders),
    );
  }

  protected get _cache(): IWorkspaceAnalysisCache {
    return this._engineState.cache;
  }

  protected set _cache(cache: IWorkspaceAnalysisCache) {
    this._engineState.cache = cache;
  }

  protected get _lastFileAnalysis(): Map<string, IFileAnalysisResult> {
    return this._engineState.fileAnalysis;
  }

  protected set _lastFileAnalysis(fileAnalysis: Map<string, IFileAnalysisResult>) {
    this._engineState.fileAnalysis = fileAnalysis;
  }

  protected get _lastFileConnections(): Map<string, IProjectedConnection[]> {
    return this._engineState.fileConnections;
  }

  protected set _lastFileConnections(fileConnections: Map<string, IProjectedConnection[]>) {
    this._engineState.fileConnections = fileConnections;
  }

  protected get _lastDiscoveredDirectories(): string[] {
    return this._engineState.discoveredDirectories;
  }

  protected set _lastDiscoveredDirectories(discoveredDirectories: string[]) {
    this._engineState.discoveredDirectories = discoveredDirectories;
  }

  protected get _lastDiscoveredFiles(): IDiscoveredFile[] {
    return this._engineState.discoveredFiles;
  }

  protected set _lastDiscoveredFiles(discoveredFiles: IDiscoveredFile[]) {
    this._engineState.discoveredFiles = discoveredFiles;
  }

  protected get _lastGitIgnoredPaths(): string[] {
    return this._engineState.gitIgnoredPaths;
  }

  protected set _lastGitIgnoredPaths(gitIgnoredPaths: string[]) {
    this._engineState.gitIgnoredPaths = gitIgnoredPaths;
  }

  protected get _lastWorkspaceRoot(): string {
    return this._engineState.workspaceRoot;
  }

  protected set _lastWorkspaceRoot(workspaceRoot: string) {
    this._engineState.workspaceRoot = workspaceRoot;
  }

  protected get _lastGraphData(): IGraphData {
    return this._engineState.graph;
  }

  protected set _lastGraphData(graphData: IGraphData) {
    this._engineState.graph = graphData;
  }

  setEventBus(eventBus: EventBus): void {
    this._eventBus = eventBus;
  }

  get registry(): PluginRegistry {
    return this._registry;
  }

  get lastFileAnalysis(): ReadonlyMap<string, IFileAnalysisResult> {
    return this._lastFileAnalysis;
  }

  async warmGraphCache(): Promise<void> {
    await this._hydrateCacheFromGraphCache({
      activeAnalysisCacheTiers: getDefaultGraphCacheHydrationTiers(),
    });
  }

  readStructuredAnalysisSnapshot(): WorkspaceAnalysisDatabaseSnapshot {
    const workspaceRoot = this._getWorkspaceRoot();
    if (!workspaceRoot) {
      return { files: [], symbols: [], relations: [] };
    }

    return readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot);
  }

  protected async _hydrateCacheFromGraphCache(
    options: WorkspacePipelineGraphCacheHydrationOptions = {},
  ): Promise<void> {
    const workspaceRoot = this._getWorkspaceRoot();
    if (!workspaceRoot) {
      return;
    }

    const requestedAnalysisCacheTiers = options.activeAnalysisCacheTiers
      ?? getDefaultGraphCacheHydrationTiers();
    if (hasHydratedAnalysisCacheTiers(this._cache, requestedAnalysisCacheTiers)) {
      return;
    }

    let attemptedRequestedHydration = false;
    while (!hasHydratedAnalysisCacheTiers(this._cache, requestedAnalysisCacheTiers)) {
      const existingHydration = this._cacheHydrationPromise;
      if (existingHydration) {
        await existingHydration;
        if (hasHydratedAnalysisCacheTiers(this._cache, requestedAnalysisCacheTiers)) {
          return;
        }
      }

      if (attemptedRequestedHydration) {
        return;
      }

      const cacheWasEmptyAtStart = !hasCacheFiles(this._cache);
      this._cacheHydrationPromise = Promise.resolve()
        .then(() => loadWorkspaceAnalysisDatabaseCache(workspaceRoot, {
          activeAnalysisCacheTiers: createRuntimeHydrationCacheTiers(
            this._cache,
            requestedAnalysisCacheTiers,
          ),
        }))
        .then((cache) => {
          if (cacheWasEmptyAtStart && hasCacheFiles(this._cache)) {
            return;
          }
          if (!hasCacheFiles(cache) && hasCacheFiles(this._cache)) {
            return;
          }

          this._cache = cache;
        })
        .finally(() => {
          this._cacheHydrationPromise = undefined;
        });

      attemptedRequestedHydration = true;
      await this._cacheHydrationPromise;
    }
  }

  protected abstract _getWorkspaceRoot(): string | undefined;
}
