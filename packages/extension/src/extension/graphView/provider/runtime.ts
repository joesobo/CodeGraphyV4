/**
 * @fileoverview Owns GraphViewProvider state and method-container wiring.
 */

import * as vscode from 'vscode';
import type { IViewContext } from '../../../core/views/contracts';
import { coreViews } from '../../../core/views/builtIns';
import { ViewRegistry } from '../../../core/views/registry';
import { DecorationManager } from '../../../core/plugins/decoration/manager';
import { EventBus } from '../../../core/plugins/eventBus';
import type { IGraphData } from '../../../shared/graph/types';
import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';
import type { IGroup } from '../../../shared/settings/groups';
import type { DagMode, NodeSizeMode } from '../../../shared/settings/modes';
import { GitHistoryAnalyzer } from '../../gitHistory/analyzer';
import { WorkspaceAnalyzer } from '../../workspaceAnalyzer/service';
import {
  initializeGraphViewProviderServices,
  restoreGraphViewProviderState,
} from './wiring/bootstrap';
import {
  createGraphViewProviderMethodContainers,
  type GraphViewProviderMethodContainers,
} from './wiring/methodContainers';
import {
  assignGraphViewProviderPublicMethods,
  type GraphViewProviderPublicMethodsTarget,
} from './wiring/publicApi';
import type { GraphViewProviderMethodSourceOwner } from './source/create';

const SELECTED_VIEW_KEY = 'codegraphy.selectedView';
const DAG_MODE_KEY = 'codegraphy.dagMode';
const NODE_SIZE_MODE_KEY = 'codegraphy.nodeSizeMode';
const DEFAULT_DEPTH_LIMIT = 1;
const DEFAULT_VIEW_ID = 'codegraphy.connections';
const DEFAULT_NODE_SIZE_MODE: NodeSizeMode = 'connections';

function createFirstWorkspaceReadyState(): {
  promise: Promise<void>;
  resolve: () => void;
} {
  let resolve!: () => void;
  const promise = new Promise<void>((resolved) => {
    resolve = resolved;
  });

  return { promise, resolve };
}

export class GraphViewProviderRuntime {
  protected _view?: vscode.WebviewView;
  protected _panels: vscode.WebviewPanel[] = [];
  protected _graphData: IGraphData = { nodes: [], edges: [] };
  protected _analyzer?: WorkspaceAnalyzer;
  protected _analyzerInitialized = false;
  protected _analyzerInitPromise?: Promise<void>;
  protected _analysisController?: AbortController;
  protected _analysisRequestId = 0;
  private readonly _viewRegistry: ViewRegistry;
  protected _activeViewId!: string;
  protected _dagMode: DagMode = null;
  protected _nodeSizeMode!: NodeSizeMode;
  protected _rawGraphData: IGraphData = { nodes: [], edges: [] };
  protected _viewContext: IViewContext = {
    activePlugins: new Set(),
    depthLimit: DEFAULT_DEPTH_LIMIT,
  };
  protected _groups: IGroup[] = [];
  protected _userGroups: IGroup[] = [];
  protected _hiddenPluginGroupIds = new Set<string>();
  protected _filterPatterns: string[] = [];
  protected _disabledRules: Set<string> = new Set();
  protected _disabledPlugins: Set<string> = new Set();
  protected _gitAnalyzer?: GitHistoryAnalyzer;
  protected _currentCommitSha?: string;
  protected _timelineActive = false;
  private _eventBus: EventBus;
  private _decorationManager: DecorationManager;
  protected _firstAnalysis = true;
  protected _resolveFirstWorkspaceReady?: () => void;
  protected readonly _firstWorkspaceReadyPromise: Promise<void>;
  protected _webviewReadyNotified = false;
  protected _indexingController?: AbortController;
  protected readonly _pluginExtensionUris = new Map<string, vscode.Uri>();
  protected readonly _methodContainers: GraphViewProviderMethodContainers;

  constructor(
    protected readonly _extensionUri: vscode.Uri,
    protected readonly _context: vscode.ExtensionContext,
  ) {
    const firstWorkspaceReady = createFirstWorkspaceReadyState();

    this._firstWorkspaceReadyPromise = firstWorkspaceReady.promise;
    this._resolveFirstWorkspaceReady = firstWorkspaceReady.resolve;

    this._analyzer = new WorkspaceAnalyzer(_context);
    this._viewRegistry = new ViewRegistry();
    this._eventBus = new EventBus();
    this._decorationManager = new DecorationManager();

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

  private initializeCoreServices(): void {
    initializeGraphViewProviderServices({
      analyzer:
        this._analyzer as Parameters<typeof initializeGraphViewProviderServices>[0]['analyzer'],
      viewRegistry: this._viewRegistry,
      coreViews,
      eventBus: this._eventBus,
      decorationManager: this._decorationManager,
      getGraphData: () => this._graphData,
      registerCommand: (id, action) => vscode.commands.registerCommand(id, action),
      pushSubscription: (subscription) => {
        this._context.subscriptions.push(subscription as vscode.Disposable);
      },
      sendMessage: (message) => {
        this._methodContainers.webview._sendMessage(message as ExtensionToWebviewMessage);
      },
      workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '',
      onDecorationsChanged: () => {
        this._methodContainers.plugin._sendDecorations();
      },
    });
  }

  private restorePersistedState(): void {
    const restoredState = restoreGraphViewProviderState({
      workspaceState: this._context.workspaceState,
      viewRegistry: this._viewRegistry,
      selectedViewKey: SELECTED_VIEW_KEY,
      dagModeKey: DAG_MODE_KEY,
      nodeSizeModeKey: NODE_SIZE_MODE_KEY,
      fallbackViewId: DEFAULT_VIEW_ID,
      fallbackNodeSizeMode: DEFAULT_NODE_SIZE_MODE,
    });

    this._activeViewId = restoredState.activeViewId;
    this._dagMode = restoredState.dagMode;
    this._nodeSizeMode = restoredState.nodeSizeMode;
  }
}
