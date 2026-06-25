import * as vscode from 'vscode';
import type {
  IProjectedConnection,
  IFileAnalysisResult,
} from '../../../../core/plugins/types/contracts';
import { PluginRegistry } from '../../../../core/plugins/registry/manager';
import {
  createWorkspaceIndexEngineState,
  FileDiscovery,
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
    await this._hydrateCacheFromGraphCache();
  }

  readStructuredAnalysisSnapshot(): WorkspaceAnalysisDatabaseSnapshot {
    const workspaceRoot = this._getWorkspaceRoot();
    if (!workspaceRoot) {
      return { files: [], symbols: [], relations: [] };
    }

    return readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot);
  }

  protected async _hydrateCacheFromGraphCache(): Promise<void> {
    const workspaceRoot = this._getWorkspaceRoot();
    if (!workspaceRoot || Object.keys(this._cache.files).length > 0) {
      return;
    }

    this._cacheHydrationPromise ??= Promise.resolve()
      .then(() => loadWorkspaceAnalysisDatabaseCache(workspaceRoot))
      .then((cache) => {
        if (Object.keys(this._cache.files).length === 0) {
          this._cache = cache;
        }
      })
      .finally(() => {
        this._cacheHydrationPromise = undefined;
      });

    await this._cacheHydrationPromise;
  }

  protected abstract _getWorkspaceRoot(): string | undefined;
}
