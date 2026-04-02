import * as vscode from 'vscode';
import type { IViewContext } from '../../../../core/views/contracts';
import type { ViewRegistry } from '../../../../core/views/registry';
import { DecorationManager } from '../../../../core/plugins/decoration/manager';
import { EventBus } from '../../../../core/plugins/eventBus';
import type { IGraphData } from '../../../../shared/graph/types';
import type { IGroup } from '../../../../shared/settings/groups';
import type { DagMode, NodeSizeMode } from '../../../../shared/settings/modes';
import { GitHistoryAnalyzer } from '../../../gitHistory/analyzer';
import { WorkspaceAnalyzer } from '../../../workspaceAnalyzer/service';
import type { GraphViewProviderAnalysisMethodsSource } from '../analysis/methods';
import type { GraphViewProviderCommandMethodsSource } from '../commands';
import type { GraphViewProviderFileActionMethodsSource } from '../file/actions';
import type { GraphViewProviderFileVisitMethodsSource } from '../file/visits';
import type { GraphViewProviderPhysicsSettingsMethodsSource } from '../physicsSettings';
import type { GraphViewProviderPluginMethodsSource } from '../plugins';
import type { GraphViewProviderPluginResourceMethodsSource } from '../pluginResources';
import type { GraphViewProviderRefreshMethodsSource } from '../refresh';
import type { GraphViewProviderMethodContainers } from '../wiring/methodContainers';
import type { GraphViewProviderSettingsStateMethodsSource } from '../settingsState';
import type { GraphViewProviderTimelineMethodsSource } from '../timeline/methods';
import type { GraphViewProviderViewContextMethodsSource } from '../view/context';
import type { GraphViewProviderViewSelectionMethodsSource } from '../view/selection';
import type { GraphViewProviderWebviewSource } from '../webview/host';

export type GraphViewProviderMethodSource =
  & GraphViewProviderAnalysisMethodsSource
  & GraphViewProviderCommandMethodsSource
  & GraphViewProviderFileActionMethodsSource
  & GraphViewProviderFileVisitMethodsSource
  & GraphViewProviderPluginMethodsSource
  & GraphViewProviderPluginResourceMethodsSource
  & GraphViewProviderPhysicsSettingsMethodsSource
  & GraphViewProviderRefreshMethodsSource
  & GraphViewProviderSettingsStateMethodsSource
  & GraphViewProviderTimelineMethodsSource
  & GraphViewProviderViewContextMethodsSource
  & GraphViewProviderViewSelectionMethodsSource
  & GraphViewProviderWebviewSource;

export interface GraphViewProviderMethodSourceOwner {
  _view?: vscode.WebviewView;
  _timelineView?: vscode.WebviewView;
  _panels: vscode.WebviewPanel[];
  _graphData: IGraphData;
  _analyzer?: WorkspaceAnalyzer;
  _analyzerInitialized: boolean;
  _analyzerInitPromise?: Promise<void>;
  _analysisController?: AbortController;
  _analysisRequestId: number;
  _viewRegistry: ViewRegistry;
  _activeViewId: string;
  _dagMode: DagMode;
  _nodeSizeMode: NodeSizeMode;
  _rawGraphData: IGraphData;
  _viewContext: IViewContext;
  _groups: IGroup[];
  _userGroups: IGroup[];
  _hiddenPluginGroupIds: Set<string>;
  _filterPatterns: string[];
  _disabledRules: Set<string>;
  _disabledPlugins: Set<string>;
  _gitAnalyzer?: GitHistoryAnalyzer;
  _currentCommitSha?: string;
  _timelineActive: boolean;
  _eventBus: EventBus;
  _decorationManager: DecorationManager;
  _firstAnalysis: boolean;
  _resolveFirstWorkspaceReady?: () => void;
  _firstWorkspaceReadyPromise: Promise<void>;
  _webviewReadyNotified: boolean;
  _indexingController?: AbortController;
  _pluginExtensionUris: Map<string, vscode.Uri>;
  _installedPluginActivationPromise?: Promise<void>;
  _extensionUri: vscode.Uri;
  _context: vscode.ExtensionContext;
  _methodContainers: GraphViewProviderMethodContainers;
  readonly _analysisMethods: GraphViewProviderMethodContainers['analysis'];
  readonly _commandMethods: GraphViewProviderMethodContainers['command'];
  readonly _fileActionMethods: GraphViewProviderMethodContainers['fileAction'];
  readonly _fileVisitMethods: GraphViewProviderMethodContainers['fileVisit'];
  readonly _pluginMethods: GraphViewProviderMethodContainers['plugin'];
  readonly _pluginResourceMethods: GraphViewProviderMethodContainers['pluginResource'];
  readonly _physicsSettingsMethods: GraphViewProviderMethodContainers['physicsSettings'];
  readonly _refreshMethods: GraphViewProviderMethodContainers['refresh'];
  readonly _settingsStateMethods: GraphViewProviderMethodContainers['settingsState'];
  readonly _timelineMethods: GraphViewProviderMethodContainers['timeline'];
  readonly _viewContextMethods: GraphViewProviderMethodContainers['viewContext'];
  readonly _viewSelectionMethods: GraphViewProviderMethodContainers['viewSelection'];
  readonly _webviewMethods: GraphViewProviderMethodContainers['webview'];
}
