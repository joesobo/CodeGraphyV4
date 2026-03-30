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
import {
  createGraphViewProviderAnalysisMethods,
  type GraphViewProviderAnalysisMethodsSource,
} from '../analysis/methods';
import {
  createGraphViewProviderCommandMethods,
  type GraphViewProviderCommandMethodsSource,
} from '../commands';
import {
  createGraphViewProviderFileActionMethods,
  type GraphViewProviderFileActionMethodsSource,
} from '../file/actions';
import {
  createGraphViewProviderFileVisitMethods,
  type GraphViewProviderFileVisitMethodsSource,
} from '../file/visits';
import {
  createGraphViewProviderPhysicsSettingsMethods,
  type GraphViewProviderPhysicsSettingsMethodsSource,
} from '../physicsSettings';
import {
  createGraphViewProviderPluginMethods,
  type GraphViewProviderPluginMethodsSource,
} from '../plugins';
import {
  createGraphViewProviderPluginResourceMethods,
  type GraphViewProviderPluginResourceMethodsSource,
} from '../pluginResources';
import {
  createGraphViewProviderRefreshMethods,
  type GraphViewProviderRefreshMethodsSource,
} from '../refresh';
import {
  createGraphViewProviderSettingsStateMethods,
  type GraphViewProviderSettingsStateMethodsSource,
} from '../settingsState';
import {
  createGraphViewProviderTimelineMethods,
  type GraphViewProviderTimelineMethodsSource,
} from '../timeline/methods';
import {
  createGraphViewProviderViewContextMethods,
  type GraphViewProviderViewContextMethodsSource,
} from '../view/context';
import {
  createGraphViewProviderViewSelectionMethods,
  type GraphViewProviderViewSelectionMethodsSource,
} from '../view/selection';
import {
  createGraphViewProviderWebviewMethods,
  type GraphViewProviderWebviewSource,
} from '../webview/host';

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
  _extensionUri: vscode.Uri;
  _context: vscode.ExtensionContext;
  _analysisMethods: ReturnType<typeof createGraphViewProviderAnalysisMethods>;
  _commandMethods: ReturnType<typeof createGraphViewProviderCommandMethods>;
  _fileActionMethods: ReturnType<typeof createGraphViewProviderFileActionMethods>;
  _fileVisitMethods: ReturnType<typeof createGraphViewProviderFileVisitMethods>;
  _pluginMethods: ReturnType<typeof createGraphViewProviderPluginMethods>;
  _pluginResourceMethods: ReturnType<typeof createGraphViewProviderPluginResourceMethods>;
  _physicsSettingsMethods: ReturnType<typeof createGraphViewProviderPhysicsSettingsMethods>;
  _refreshMethods: ReturnType<typeof createGraphViewProviderRefreshMethods>;
  _settingsStateMethods: ReturnType<typeof createGraphViewProviderSettingsStateMethods>;
  _timelineMethods: ReturnType<typeof createGraphViewProviderTimelineMethods>;
  _viewContextMethods: ReturnType<typeof createGraphViewProviderViewContextMethods>;
  _viewSelectionMethods: ReturnType<typeof createGraphViewProviderViewSelectionMethods>;
  _webviewMethods: ReturnType<typeof createGraphViewProviderWebviewMethods>;
}
