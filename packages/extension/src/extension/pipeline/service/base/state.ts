import * as vscode from 'vscode';
import type {
  IProjectedConnection,
  IFileAnalysisResult,
} from '../../../../core/plugins/types/contracts';
import { PluginRegistry } from '../../../../core/plugins/registry/manager';
import { FileDiscovery } from '../../../../core/discovery/file/service';
import type { IDiscoveredFile } from '../../../../core/discovery/contracts';
import { Configuration } from '../../../config/reader';
import { EventBus } from '../../../../core/plugins/events/bus';
import type { IWorkspaceAnalysisCache } from '../../cache';
import {
  readWorkspaceAnalysisDatabaseSnapshot,
  type WorkspaceAnalysisDatabaseSnapshot,
} from '../../database/cache/storage';
import { createWorkspacePipelineInitialCache } from '../cache/initialState';

export abstract class WorkspacePipelineStateBase {
  protected readonly _config: Configuration;
  protected readonly _registry: PluginRegistry;
  protected readonly _discovery: FileDiscovery;
  protected readonly _context: vscode.ExtensionContext;
  protected _cache: IWorkspaceAnalysisCache;
  protected _lastFileAnalysis: Map<string, IFileAnalysisResult> = new Map();
  protected _lastFileConnections: Map<string, IProjectedConnection[]> = new Map();
  protected _lastDiscoveredFiles: IDiscoveredFile[] = [];
  protected _lastWorkspaceRoot = '';
  protected _eventBus?: EventBus;

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
    this._config = new Configuration();
    this._registry = new PluginRegistry();
    this._discovery = new FileDiscovery();
    this._cache = createWorkspacePipelineInitialCache(vscode.workspace.workspaceFolders);
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

  readStructuredAnalysisSnapshot(): WorkspaceAnalysisDatabaseSnapshot {
    const workspaceRoot = this._getWorkspaceRoot();
    if (!workspaceRoot) {
      return { files: [], symbols: [], relations: [] };
    }

    return readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot);
  }

  protected abstract _getWorkspaceRoot(): string | undefined;
}
