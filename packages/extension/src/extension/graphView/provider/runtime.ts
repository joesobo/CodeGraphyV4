/**
 * @fileoverview Owns GraphViewProvider state and method-container wiring.
 */

import * as vscode from 'vscode';
import type { IViewContext } from '../../../core/views/contracts';
import { ViewRegistry } from '../../../core/views/registry';
import { DecorationManager } from '../../../core/plugins/decoration/manager';
import { EventBus } from '../../../core/plugins/events/bus';
import type { IGraphData } from '../../../shared/graph/types';
import type { IGroup } from '../../../shared/settings/groups';
import type { DagMode, NodeSizeMode } from '../../../shared/settings/modes';
import { GitHistoryAnalyzer } from '../../gitHistory/analyzer';
import { WorkspacePipeline } from '../../pipeline/service';
import {
  readCodeGraphyRepoMeta,
  writeCodeGraphyRepoMeta,
} from '../../repoSettings/meta';
import {
  createGraphViewProviderMethodContainers,
  type GraphViewProviderMethodContainers,
} from './wiring/methodContainers';
import {
  assignGraphViewProviderPublicMethods,
  type GraphViewProviderPublicMethodsTarget,
} from './wiring/publicApi';
import type { GraphViewProviderMethodSourceOwner } from './source/create';
import {
  createExtensionMessageEmitter,
} from './extensionMessages';
import { createFirstWorkspaceReadyState } from './firstWorkspaceReady';
import {
  initializeGraphViewProviderRuntimeServices,
  restoreGraphViewProviderRuntimeState,
  type RuntimeBootstrapSource,
} from './runtimeBootstrap';
import {
  createEmptyGraphData,
  createEmptyGroups,
  createInitialViewContext,
  createPluginExtensionUris,
  createStringSet,
  DEFAULT_NODE_SIZE_MODE,
} from './runtimeDefaults';

interface PendingWorkspaceRefreshState {
  filePaths: Set<string>;
  logMessage: string;
}

export class GraphViewProviderRuntime {
  protected _view?: vscode.WebviewView;
  protected _timelineView?: vscode.WebviewView;
  protected _panels: vscode.WebviewPanel[] = [];
  protected _graphData: IGraphData = createEmptyGraphData();
  protected _analyzer?: WorkspacePipeline;
  protected _analyzerInitialized = false;
  protected _analyzerInitPromise?: Promise<void>;
  protected _analysisController?: AbortController;
  protected _analysisRequestId = 0;
  protected _changedFilePaths: string[] = [];
  private readonly _viewRegistry: ViewRegistry;
  protected _depthMode = false;
  protected _dagMode: DagMode = null;
  protected _nodeSizeMode!: NodeSizeMode;
  protected _rawGraphData: IGraphData = createEmptyGraphData();
  protected _viewContext: IViewContext = createInitialViewContext();
  protected _groups: IGroup[] = createEmptyGroups();
  protected _userGroups: IGroup[] = createEmptyGroups();
  protected _filterPatterns: string[] = [];
  protected _disabledPlugins: Set<string> = createStringSet();
  protected _gitAnalyzer?: GitHistoryAnalyzer;
  protected _currentCommitSha?: string;
  protected _timelineActive = false;
  protected _eventBus: EventBus;
  protected _decorationManager: DecorationManager;
  protected _firstAnalysis = true;
  protected _resolveFirstWorkspaceReady?: () => void;
  protected readonly _firstWorkspaceReadyPromise: Promise<void>;
  protected _webviewReadyNotified = false;
  protected _indexingController?: AbortController;
  protected _pendingWorkspaceRefresh?: PendingWorkspaceRefreshState;
  protected readonly _pluginExtensionUris = createPluginExtensionUris();
  protected _installedPluginActivationPromise: Promise<void> = Promise.resolve();
  protected readonly _extensionMessageEmitter = createExtensionMessageEmitter();
  protected readonly _methodContainers: GraphViewProviderMethodContainers;

  constructor(
    protected readonly _extensionUri: vscode.Uri,
    protected readonly _context: vscode.ExtensionContext,
  ) {
    const firstWorkspaceReady = createFirstWorkspaceReadyState();

    this._firstWorkspaceReadyPromise = firstWorkspaceReady.promise;
    this._resolveFirstWorkspaceReady = firstWorkspaceReady.resolve;

    this._analyzer = new WorkspacePipeline(_context);
    this._viewRegistry = new ViewRegistry();
    this._eventBus = new EventBus();
    this._decorationManager = new DecorationManager();
    this._context.subscriptions.push({
      dispose: () => {
        this._extensionMessageEmitter.dispose();
      },
    });

    this.initializeCoreServices();
    this.restorePersistedState();
    this._methodContainers = createGraphViewProviderMethodContainers(
      this as unknown as GraphViewProviderMethodSourceOwner,
    );

    assignGraphViewProviderPublicMethods(
      this as unknown as GraphViewProviderPublicMethodsTarget,
    );
    this._methodContainers.settingsState._loadDisabledRulesAndPlugins();
  }

  public get viewRegistry(): ViewRegistry {
    return this._viewRegistry;
  }

  public setInstalledPluginActivationPromise(promise: Promise<void>): void {
    this._installedPluginActivationPromise = promise;
  }

  public isGraphOpen(): boolean {
    if (this._view?.visible) {
      return true;
    }

    return this._panels.some(panel => panel.visible);
  }

  public invalidateWorkspaceFiles(filePaths: readonly string[]): string[] {
    return this._analyzer?.invalidateWorkspaceFiles(filePaths) ?? [];
  }

  public invalidatePluginFiles(pluginIds: readonly string[]): string[] {
    return this._analyzer?.invalidatePluginFiles(pluginIds) ?? [];
  }

  public markWorkspaceRefreshPending(
    logMessage: string,
    filePaths: readonly string[] = [],
  ): void {
    const pending = this._pendingWorkspaceRefresh ?? {
      filePaths: new Set<string>(),
      logMessage,
    };

    pending.logMessage = logMessage;
    for (const filePath of filePaths) {
      pending.filePaths.add(filePath);
    }

    this._pendingWorkspaceRefresh = pending;
    this._persistPendingWorkspaceRefresh([...pending.filePaths]);
  }

  public flushPendingWorkspaceRefresh(): void {
    if (!this.isGraphOpen()) {
      return;
    }

    const pending = this._pendingWorkspaceRefresh ?? this._loadPersistedWorkspaceRefresh();
    if (!pending) {
      return;
    }

    this._pendingWorkspaceRefresh = undefined;
    this._persistPendingWorkspaceRefresh([]);
    console.log(pending.logMessage);
    if (this._methodContainers.refresh.refreshChangedFiles) {
      void this._methodContainers.refresh.refreshChangedFiles([...pending.filePaths]);
      return;
    }

    this.invalidateWorkspaceFiles([...pending.filePaths]);
    void this._methodContainers.refresh.refresh();
  }

  private initializeCoreServices(): void {
    const source = {
      _analyzer: this._analyzer,
      _context: this._context,
      _viewRegistry: this._viewRegistry,
      _eventBus: this._eventBus,
      _decorationManager: this._decorationManager,
    } as RuntimeBootstrapSource;

    Object.defineProperties(source, {
      _graphData: {
        get: () => this._graphData,
      },
      getMethodContainers: {
        value: () => this._methodContainers,
      },
    });

    initializeGraphViewProviderRuntimeServices(source);
  }

  private restorePersistedState(): void {
    const restoredState = restoreGraphViewProviderRuntimeState(
      this._context,
      DEFAULT_NODE_SIZE_MODE,
    );

    this._depthMode = restoredState.depthMode;
    this._dagMode = restoredState.dagMode;
    this._nodeSizeMode = restoredState.nodeSizeMode;
  }

  private _getWorkspaceRoot(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }

  private _persistPendingWorkspaceRefresh(filePaths: readonly string[]): void {
    const workspaceRoot = this._getWorkspaceRoot();
    if (!workspaceRoot) {
      return;
    }

    const meta = readCodeGraphyRepoMeta(workspaceRoot);
    writeCodeGraphyRepoMeta(workspaceRoot, {
      ...meta,
      pendingChangedFiles: [...filePaths],
    });
  }

  private _loadPersistedWorkspaceRefresh(): PendingWorkspaceRefreshState | undefined {
    const workspaceRoot = this._getWorkspaceRoot();
    if (!workspaceRoot) {
      return undefined;
    }

    const meta = readCodeGraphyRepoMeta(workspaceRoot);
    if (meta.pendingChangedFiles.length === 0) {
      return undefined;
    }

    return {
      filePaths: new Set(meta.pendingChangedFiles),
      logMessage: '[CodeGraphy] Applying pending workspace changes',
    };
  }

  protected _notifyExtensionMessage(message: unknown): void {
    this._extensionMessageEmitter.fire(message);
  }
}
