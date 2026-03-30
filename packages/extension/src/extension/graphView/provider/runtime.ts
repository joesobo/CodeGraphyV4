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
  createGraphViewProviderAnalysisMethods,
} from './analysis/methods';
import { initializeGraphViewProviderServices, restoreGraphViewProviderState } from './bootstrap';
import { createGraphViewProviderCommandMethods } from './commands';
import { createGraphViewProviderFileActionMethods } from './file/actions';
import { createGraphViewProviderFileVisitMethods } from './file/visits';
import { createGraphViewProviderPhysicsSettingsMethods } from './physicsSettings';
import { createGraphViewProviderPluginMethods } from './plugins';
import { createGraphViewProviderPluginResourceMethods } from './pluginResources';
import {
  assignGraphViewProviderPublicMethods,
  type GraphViewProviderPublicMethodsTarget,
} from './publicApi';
import { createGraphViewProviderRefreshMethods } from './refresh';
import { createGraphViewProviderSettingsStateMethods } from './settingsState';
import {
  createGraphViewProviderMethodSource,
  type GraphViewProviderMethodSourceOwner,
} from './source/create';
import { createGraphViewProviderTimelineMethods } from './timeline/methods';
import { createGraphViewProviderViewContextMethods } from './view/context';
import { createGraphViewProviderViewSelectionMethods } from './view/selection';
import { createGraphViewProviderWebviewMethods } from './webview/host';

const SELECTED_VIEW_KEY = 'codegraphy.selectedView';
const DAG_MODE_KEY = 'codegraphy.dagMode';
const NODE_SIZE_MODE_KEY = 'codegraphy.nodeSizeMode';
const DEFAULT_DEPTH_LIMIT = 1;

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
  protected _activeViewId: string;
  protected _dagMode: DagMode = null;
  protected _nodeSizeMode: NodeSizeMode = 'connections';
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

  protected readonly _analysisMethods: ReturnType<typeof createGraphViewProviderAnalysisMethods>;
  protected readonly _commandMethods: ReturnType<typeof createGraphViewProviderCommandMethods>;
  protected readonly _fileActionMethods:
    ReturnType<typeof createGraphViewProviderFileActionMethods>;
  protected readonly _fileVisitMethods: ReturnType<typeof createGraphViewProviderFileVisitMethods>;
  protected readonly _pluginMethods: ReturnType<typeof createGraphViewProviderPluginMethods>;
  protected readonly _pluginResourceMethods:
    ReturnType<typeof createGraphViewProviderPluginResourceMethods>;
  protected readonly _physicsSettingsMethods:
    ReturnType<typeof createGraphViewProviderPhysicsSettingsMethods>;
  protected readonly _refreshMethods: ReturnType<typeof createGraphViewProviderRefreshMethods>;
  protected readonly _settingsStateMethods:
    ReturnType<typeof createGraphViewProviderSettingsStateMethods>;
  protected readonly _timelineMethods: ReturnType<typeof createGraphViewProviderTimelineMethods>;
  protected readonly _viewContextMethods:
    ReturnType<typeof createGraphViewProviderViewContextMethods>;
  protected readonly _viewSelectionMethods:
    ReturnType<typeof createGraphViewProviderViewSelectionMethods>;
  protected readonly _webviewMethods: ReturnType<typeof createGraphViewProviderWebviewMethods>;

  constructor(
    protected readonly _extensionUri: vscode.Uri,
    protected readonly _context: vscode.ExtensionContext,
  ) {
    this._firstWorkspaceReadyPromise = new Promise<void>((resolve) => {
      this._resolveFirstWorkspaceReady = resolve;
    });

    this._analyzer = new WorkspaceAnalyzer(_context);
    this._viewRegistry = new ViewRegistry();
    this._eventBus = new EventBus();
    this._decorationManager = new DecorationManager();

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
        this._webviewMethods._sendMessage(message as ExtensionToWebviewMessage);
      },
      workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '',
      onDecorationsChanged: () => {
        this._pluginMethods._sendDecorations();
      },
    });

    const restoredState = restoreGraphViewProviderState({
      workspaceState: this._context.workspaceState,
      viewRegistry: this._viewRegistry,
      selectedViewKey: SELECTED_VIEW_KEY,
      dagModeKey: DAG_MODE_KEY,
      nodeSizeModeKey: NODE_SIZE_MODE_KEY,
      fallbackViewId: 'codegraphy.connections',
      fallbackNodeSizeMode: 'connections',
    });
    this._activeViewId = restoredState.activeViewId;
    this._dagMode = restoredState.dagMode;
    this._nodeSizeMode = restoredState.nodeSizeMode;

    const methodSource = createGraphViewProviderMethodSource(
      this as unknown as GraphViewProviderMethodSourceOwner,
    );
    this._analysisMethods = createGraphViewProviderAnalysisMethods(methodSource);
    this._commandMethods = createGraphViewProviderCommandMethods(methodSource);
    this._fileActionMethods = createGraphViewProviderFileActionMethods(methodSource);
    this._fileVisitMethods = createGraphViewProviderFileVisitMethods(methodSource);
    this._pluginResourceMethods = createGraphViewProviderPluginResourceMethods(methodSource);
    this._pluginMethods = createGraphViewProviderPluginMethods(methodSource);
    this._physicsSettingsMethods = createGraphViewProviderPhysicsSettingsMethods(methodSource);
    this._refreshMethods = createGraphViewProviderRefreshMethods(methodSource);
    this._settingsStateMethods = createGraphViewProviderSettingsStateMethods(methodSource);
    this._timelineMethods = createGraphViewProviderTimelineMethods(methodSource);
    this._viewContextMethods = createGraphViewProviderViewContextMethods(methodSource);
    this._viewSelectionMethods = createGraphViewProviderViewSelectionMethods(methodSource);
    this._webviewMethods = createGraphViewProviderWebviewMethods(methodSource);

    // These containers are consumed through the extracted method-source adapter.
    void this._analysisMethods;
    void this._commandMethods;
    void this._fileActionMethods;
    void this._fileVisitMethods;
    void this._pluginResourceMethods;
    void this._physicsSettingsMethods;
    void this._refreshMethods;
    void this._timelineMethods;
    void this._viewContextMethods;
    void this._viewSelectionMethods;

    assignGraphViewProviderPublicMethods(
      this as unknown as GraphViewProviderPublicMethodsTarget,
    );
    this._settingsStateMethods._loadDisabledRulesAndPlugins();
  }

  public get viewRegistry(): ViewRegistry {
    return this._viewRegistry;
  }
}
