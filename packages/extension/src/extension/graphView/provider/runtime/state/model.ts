/**
 * @fileoverview Owns GraphViewProvider state and method-container wiring.
 */

import * as vscode from 'vscode';
import type { IViewContext } from '../../../../../core/views/contracts';
import { ViewRegistry } from '../../../../../core/views/registry';
import { DecorationManager } from '../../../../../core/plugins/decoration/manager';
import { EventBus } from '../../../../../core/plugins/events/bus';
import type { IGraphData } from '../../../../../shared/graph/contracts';
import type { IGroup } from '../../../../../shared/settings/groups';
import type { DagMode, NodeSizeMode } from '../../../../../shared/settings/modes';
import { GitHistoryAnalyzer } from '../../../../gitHistory/analyzer';
import { WorkspacePipeline } from '../../../../pipeline/service/lifecycleFacade';
import {
  createGraphViewProviderMethodContainers,
  type GraphViewProviderMethodContainers,
} from '../../wiring/methodContainers';
import {
  assignGraphViewProviderPublicMethods,
  type GraphViewProviderPublicMethodsTarget,
} from '../../wiring/publicApi';
import type { GraphViewProviderMethodSourceOwner } from '../../source/create';
import { createExtensionMessageEmitter } from '../../messageEmitter';
import { createFirstWorkspaceReadyState } from '../../firstWorkspaceReady';
import {
  createPluginExtensionUris,
  DEFAULT_NODE_SIZE_MODE,
} from '../../runtimeDefaults';
import { defineGraphViewProviderMethodAccessors } from '../methodAccessors';
import {
  getWorkspaceRoot,
  initializeRuntimeStateServices,
  restorePersistedRuntimeState,
} from './bootstrap';
import { createGraphViewProviderRuntimeDataState } from './data';
import { createGraphViewProviderRuntimeFlagState } from './flags';
import {
  invalidatePluginFiles,
  invalidateWorkspaceFiles,
  mergePendingWorkspaceRefresh,
} from './refresh';
import { isGraphViewVisible } from './visibility';
import {
  loadPersistedWorkspaceRefresh,
  persistPendingWorkspaceRefresh,
  type PendingWorkspaceRefreshState,
} from '../workspaceRefreshPersistence';

export class GraphViewProviderRuntime {
  protected _view?: vscode.WebviewView;
  protected _timelineView?: vscode.WebviewView;
  protected _panels!: vscode.WebviewPanel[];
  protected _graphData!: IGraphData;
  protected _analyzer?: WorkspacePipeline;
  protected _analyzerInitialized!: boolean;
  protected _analyzerInitPromise?: Promise<void>;
  protected _analysisController?: AbortController;
  protected _analysisRequestId!: number;
  protected _changedFilePaths!: string[];
  private readonly _viewRegistry: ViewRegistry;
  protected _depthMode!: boolean;
  protected _dagMode!: DagMode;
  protected _nodeSizeMode!: NodeSizeMode;
  protected _rawGraphData!: IGraphData;
  protected _viewContext!: IViewContext;
  protected _groups!: IGroup[];
  protected _userGroups!: IGroup[];
  protected _filterPatterns!: string[];
  protected _disabledPlugins!: Set<string>;
  protected _gitAnalyzer?: GitHistoryAnalyzer;
  protected _currentCommitSha?: string;
  protected _timelineActive!: boolean;
  protected _eventBus: EventBus;
  protected _decorationManager: DecorationManager;
  protected _firstAnalysis!: boolean;
  protected _resolveFirstWorkspaceReady?: () => void;
  protected readonly _firstWorkspaceReadyPromise: Promise<void>;
  protected _webviewReadyNotified!: boolean;
  protected _indexingController?: AbortController;
  protected _pendingWorkspaceRefresh?: PendingWorkspaceRefreshState;
  protected readonly _pluginExtensionUris = createPluginExtensionUris();
  protected _installedPluginActivationPromise!: Promise<void>;
  protected readonly _extensionMessageEmitter = createExtensionMessageEmitter();
  protected readonly _methodContainers: GraphViewProviderMethodContainers;

  declare protected readonly _analysisMethods: GraphViewProviderMethodContainers['analysis'];
  declare protected readonly _commandMethods: GraphViewProviderMethodContainers['command'];
  declare protected readonly _fileActionMethods: GraphViewProviderMethodContainers['fileAction'];
  declare protected readonly _fileVisitMethods: GraphViewProviderMethodContainers['fileVisit'];
  declare protected readonly _pluginMethods: GraphViewProviderMethodContainers['plugin'];
  declare protected readonly _pluginResourceMethods: GraphViewProviderMethodContainers['pluginResource'];
  declare protected readonly _physicsSettingsMethods: GraphViewProviderMethodContainers['physicsSettings'];
  declare protected readonly _refreshMethods: GraphViewProviderMethodContainers['refresh'];
  declare protected readonly _settingsStateMethods: GraphViewProviderMethodContainers['settingsState'];
  declare protected readonly _timelineMethods: GraphViewProviderMethodContainers['timeline'];
  declare protected readonly _viewContextMethods: GraphViewProviderMethodContainers['viewContext'];
  declare protected readonly _viewSelectionMethods: GraphViewProviderMethodContainers['viewSelection'];
  declare protected readonly _webviewMethods: GraphViewProviderMethodContainers['webview'];

  constructor(
    protected readonly _extensionUri: vscode.Uri,
    protected readonly _context: vscode.ExtensionContext,
  ) {
    const firstWorkspaceReady = createFirstWorkspaceReadyState();

    this._firstWorkspaceReadyPromise = firstWorkspaceReady.promise;
    this._resolveFirstWorkspaceReady = firstWorkspaceReady.resolve;

    Object.assign(this, createGraphViewProviderRuntimeDataState());
    Object.assign(this, createGraphViewProviderRuntimeFlagState());

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
    defineGraphViewProviderMethodAccessors(
      this as unknown as {
        _methodContainers: GraphViewProviderMethodContainers;
      },
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
    return isGraphViewVisible(this._view, this._panels);
  }

  public invalidateWorkspaceFiles(filePaths: readonly string[]): string[] {
    return invalidateWorkspaceFiles(this._analyzer, filePaths);
  }

  public invalidatePluginFiles(pluginIds: readonly string[]): string[] {
    return invalidatePluginFiles(this._analyzer, pluginIds);
  }

  public markWorkspaceRefreshPending(
    logMessage: string,
    filePaths: readonly string[] = [],
  ): void {
    this._pendingWorkspaceRefresh = mergePendingWorkspaceRefresh(
      this._pendingWorkspaceRefresh,
      logMessage,
      filePaths,
    );
    persistPendingWorkspaceRefresh(this._getWorkspaceRoot(), [
      ...this._pendingWorkspaceRefresh.filePaths,
    ]);
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
    persistPendingWorkspaceRefresh(this._getWorkspaceRoot(), []);
    console.log(pending.logMessage);
    if (this._methodContainers.refresh.refreshChangedFiles) {
      void this._methodContainers.refresh.refreshChangedFiles([...pending.filePaths]);
      return;
    }

    this.invalidateWorkspaceFiles([...pending.filePaths]);
    void this._methodContainers.refresh.refresh();
  }

  private initializeCoreServices(): void {
    initializeRuntimeStateServices(
      {
        _analyzer: this._analyzer,
        _context: this._context,
        _viewRegistry: this._viewRegistry,
        _eventBus: this._eventBus,
        _decorationManager: this._decorationManager,
      },
      () => this._graphData,
      () => this._methodContainers,
    );
  }

  private restorePersistedState(): void {
    const restoredState = restorePersistedRuntimeState(
      this._context,
      DEFAULT_NODE_SIZE_MODE,
    );

    this._depthMode = restoredState.depthMode;
    this._dagMode = restoredState.dagMode;
    this._nodeSizeMode = restoredState.nodeSizeMode;
  }

  private _getWorkspaceRoot(): string | undefined {
    return getWorkspaceRoot(vscode.workspace.workspaceFolders);
  }

  private _loadPersistedWorkspaceRefresh(): PendingWorkspaceRefreshState | undefined {
    return loadPersistedWorkspaceRefresh(this._getWorkspaceRoot());
  }

  protected _notifyExtensionMessage(message: unknown): void {
    this._extensionMessageEmitter.fire(message);
  }
}
