import * as vscode from 'vscode';
import type { IViewContext } from '../../../../core/views/contracts';
import type { ViewRegistry } from '../../../../core/views/registry';
import { DecorationManager } from '../../../../core/plugins/decoration/manager';
import { EventBus } from '../../../../core/plugins/events/bus';
import type { IGraphData } from '../../../../shared/graph/types';
import type { IGroup } from '../../../../shared/settings/groups';
import type { DagMode, NodeSizeMode } from '../../../../shared/settings/modes';
import { GitHistoryAnalyzer } from '../../../gitHistory/analyzer';
import { WorkspacePipeline } from '../../../pipeline/service';
import type {
  GraphViewProviderAnalysisMethods,
  GraphViewProviderAnalysisMethodsSource,
} from '../analysis/methods';
import type {
  GraphViewProviderCommandMethods,
  GraphViewProviderCommandMethodsSource,
} from '../commands';
import type {
  GraphViewProviderFileActionMethods,
  GraphViewProviderFileActionMethodsSource,
} from '../file/actions';
import type {
  GraphViewProviderFileVisitMethods,
  GraphViewProviderFileVisitMethodsSource,
} from '../file/visits';
import type {
  GraphViewProviderPhysicsSettingsMethods,
  GraphViewProviderPhysicsSettingsMethodsSource,
} from '../physicsSettings';
import type {
  GraphViewProviderPluginMethods,
  GraphViewProviderPluginMethodsSource,
} from '../plugins';
import type {
  GraphViewProviderPluginResourceMethods,
  GraphViewProviderPluginResourceMethodsSource,
} from '../pluginResources';
import type {
  GraphViewProviderRefreshMethods,
  GraphViewProviderRefreshMethodsSource,
} from '../refresh';
import type { GraphViewProviderMethodContainers } from '../wiring/methodContainers';
import type {
  GraphViewProviderSettingsStateMethods,
  GraphViewProviderSettingsStateMethodsSource,
} from '../settingsState';
import type {
  GraphViewProviderTimelineMethods,
  GraphViewProviderTimelineMethodsSource,
} from '../timeline/types';
import type {
  GraphViewProviderViewContextMethods,
  GraphViewProviderViewContextMethodsSource,
} from '../view/context';
import type {
  GraphViewProviderViewSelectionMethods,
  GraphViewProviderViewSelectionMethodsSource,
} from '../view/selection';
import type {
  GraphViewProviderWebviewMethods,
  GraphViewProviderWebviewSource,
} from '../webview/host';

export type GraphViewProviderMethodSource =
  & GraphViewProviderMethodSourceOwner
  & GraphViewProviderAnalysisMethods
  & GraphViewProviderAnalysisMethodsSource
  & GraphViewProviderCommandMethods
  & GraphViewProviderCommandMethodsSource
  & GraphViewProviderFileActionMethods
  & GraphViewProviderFileActionMethodsSource
  & GraphViewProviderFileVisitMethods
  & GraphViewProviderFileVisitMethodsSource
  & GraphViewProviderPluginMethods
  & GraphViewProviderPluginMethodsSource
  & GraphViewProviderPluginResourceMethods
  & GraphViewProviderPluginResourceMethodsSource
  & GraphViewProviderPhysicsSettingsMethods
  & GraphViewProviderPhysicsSettingsMethodsSource
  & GraphViewProviderRefreshMethods
  & GraphViewProviderRefreshMethodsSource
  & GraphViewProviderSettingsStateMethods
  & GraphViewProviderSettingsStateMethodsSource
  & GraphViewProviderTimelineMethods
  & GraphViewProviderTimelineMethodsSource
  & GraphViewProviderViewContextMethods
  & GraphViewProviderViewContextMethodsSource
  & GraphViewProviderViewSelectionMethods
  & GraphViewProviderViewSelectionMethodsSource
  & GraphViewProviderWebviewMethods
  & GraphViewProviderWebviewSource;

export interface GraphViewProviderMethodSourceOwner {
  _view?: vscode.WebviewView;
  _timelineView?: vscode.WebviewView;
  _panels: vscode.WebviewPanel[];
  _graphData: IGraphData;
  _analyzer?: WorkspacePipeline;
  _analyzerInitialized: boolean;
  _analyzerInitPromise?: Promise<void>;
  _analysisController?: AbortController;
  _analysisRequestId: number;
  _viewRegistry: ViewRegistry;
  _depthMode: boolean;
  _dagMode: DagMode;
  _nodeSizeMode: NodeSizeMode;
  _rawGraphData: IGraphData;
  _viewContext: IViewContext;
  _groups: IGroup[];
  _userGroups: IGroup[];
  _hiddenPluginGroupIds: Set<string>;
  _filterPatterns: string[];
  _disabledSources: Set<string>;
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
  _notifyExtensionMessage(message: unknown): void;
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
