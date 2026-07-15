import * as vscode from 'vscode';
import {
  createWorkspaceIndexEngineState,
  FileDiscovery,
  type IDiscoveredFile,
  type WorkspaceIndexEngineState,
} from '@codegraphy-dev/core';
import type { IFileAnalysisResult, IProjectedConnection } from '../../../../core/plugins/types/contracts';
import { PluginRegistry } from '../../../../core/plugins/registry/manager';
import { EventBus } from '../../../../core/plugins/events/bus';
import type { IGraphData } from '../../../../shared/graph/contracts';
import { Configuration } from '../../../config/reader';
import type { IWorkspaceAnalysisCache } from '../../cache';
import { createWorkspacePipelineInitialCache } from '../cache/initialState';

export abstract class WorkspacePipelineEngineStateBase {
  protected readonly _config: Configuration;
  protected readonly _registry: PluginRegistry;
  protected readonly _discovery: FileDiscovery;
  protected readonly _context: vscode.ExtensionContext;
  protected readonly _engineState: WorkspaceIndexEngineState;
  protected _eventBus?: EventBus;

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
    this._config = new Configuration();
    this._registry = new PluginRegistry();
    this._discovery = new FileDiscovery();
    this._engineState = createWorkspaceIndexEngineState(
      createWorkspacePipelineInitialCache(vscode.workspace.workspaceFolders),
    );
  }

  protected get _cache(): IWorkspaceAnalysisCache { return this._engineState.cache; }
  protected set _cache(cache: IWorkspaceAnalysisCache) { this._engineState.cache = cache; }
  protected get _lastFileAnalysis(): Map<string, IFileAnalysisResult> {
    return this._engineState.fileAnalysis;
  }
  protected set _lastFileAnalysis(value: Map<string, IFileAnalysisResult>) {
    this._engineState.fileAnalysis = value;
  }
  protected get _lastFileConnections(): Map<string, IProjectedConnection[]> {
    return this._engineState.fileConnections;
  }
  protected set _lastFileConnections(value: Map<string, IProjectedConnection[]>) {
    this._engineState.fileConnections = value;
  }
  protected get _lastDiscoveredDirectories(): string[] {
    return this._engineState.discoveredDirectories;
  }
  protected set _lastDiscoveredDirectories(value: string[]) {
    this._engineState.discoveredDirectories = value;
  }
  protected get _lastDiscoveredFiles(): IDiscoveredFile[] {
    return this._engineState.discoveredFiles;
  }
  protected set _lastDiscoveredFiles(value: IDiscoveredFile[]) {
    this._engineState.discoveredFiles = value;
  }
  protected get _lastGitIgnoredPaths(): string[] { return this._engineState.gitIgnoredPaths; }
  protected set _lastGitIgnoredPaths(value: string[]) { this._engineState.gitIgnoredPaths = value; }
  protected get _lastWorkspaceRoot(): string { return this._engineState.workspaceRoot; }
  protected set _lastWorkspaceRoot(value: string) { this._engineState.workspaceRoot = value; }
  protected get _lastGraphData(): IGraphData { return this._engineState.graph; }
  protected set _lastGraphData(value: IGraphData) { this._engineState.graph = value; }

  setEventBus(eventBus: EventBus): void { this._eventBus = eventBus; }
  get registry(): PluginRegistry { return this._registry; }
  get lastFileAnalysis(): ReadonlyMap<string, IFileAnalysisResult> { return this._lastFileAnalysis; }

  protected abstract _getWorkspaceRoot(): string | undefined;
}
