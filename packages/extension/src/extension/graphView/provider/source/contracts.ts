import * as vscode from 'vscode';
import type { IViewContext } from '../../../../core/views/contracts';
import type { ViewRegistry } from '../../../../core/views/registry';
import { DecorationManager } from '../../../../core/plugins/decoration/manager';
import { EventBus } from '../../../../core/plugins/events/bus';
import type { IGraphData } from '../../../../shared/graph/contracts';
import type { IGroup } from '../../../../shared/settings/groups';
import type { DagMode, NodeSizeMode } from '../../../../shared/settings/modes';
import { WorkspacePipeline } from '../../../pipeline/service/lifecycleFacade';
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
  GraphViewProviderFileInfoMethods,
  GraphViewProviderFileInfoMethodsSource,
} from '../file/info';
import type {
  GraphViewProviderPhysicsSettingsMethods,
  GraphViewProviderPhysicsSettingsMethodsSource,
} from '../physicsSettings';
import type {
  GraphViewProviderPluginMethods,
  GraphViewProviderPluginMethodsSource,
} from '../plugin/methods';
import type {
  GraphViewProviderPluginResourceMethods,
  GraphViewProviderPluginResourceMethodsSource,
} from '../plugin/resources';
import type {
  GraphViewProviderQueryMethods,
  GraphViewProviderQueryMethodsSource,
} from '../query/methods';
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
  & GraphViewProviderFileInfoMethods
  & GraphViewProviderFileInfoMethodsSource
  & GraphViewProviderPluginMethods
  & GraphViewProviderPluginMethodsSource
  & GraphViewProviderPluginResourceMethods
  & GraphViewProviderPluginResourceMethodsSource
  & GraphViewProviderPhysicsSettingsMethods
  & GraphViewProviderPhysicsSettingsMethodsSource
  & GraphViewProviderQueryMethods
  & GraphViewProviderQueryMethodsSource
  & GraphViewProviderRefreshMethods
  & GraphViewProviderRefreshMethodsSource
  & GraphViewProviderSettingsStateMethods
  & GraphViewProviderSettingsStateMethodsSource
  & GraphViewProviderViewContextMethods
  & GraphViewProviderViewContextMethodsSource
  & GraphViewProviderViewSelectionMethods
  & GraphViewProviderViewSelectionMethodsSource
  & GraphViewProviderWebviewMethods
  & GraphViewProviderWebviewSource;

export interface GraphViewProviderMethodSourceOwner {
  _view?: vscode.WebviewView;
  _panels: vscode.WebviewPanel[];
  _graphData: IGraphData;
  _analyzer?: WorkspacePipeline;
  _analyzerInitialized: boolean;
  _analyzerInitPromise?: Promise<void>;
  _analysisController?: AbortController;
  _analysisRequestId: number;
  _changedFilePaths?: string[];
  _viewRegistry: ViewRegistry;
  _depthMode: boolean;
  _dagMode: DagMode;
  _nodeSizeMode: NodeSizeMode;
  _rawGraphData: IGraphData;
  _viewContext: IViewContext;
  _groups: IGroup[];
  _userGroups: IGroup[];
  _filterPatterns: string[];
  _disabledPlugins: Set<string>;
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
  invalidatePluginFiles(pluginIds: readonly string[]): string[];
  readonly _analysisMethods: GraphViewProviderMethodContainers['analysis'];
  readonly _commandMethods: GraphViewProviderMethodContainers['command'];
  readonly _fileActionMethods: GraphViewProviderMethodContainers['fileAction'];
  readonly _fileInfoMethods: GraphViewProviderMethodContainers['fileInfo'];
  readonly _pluginMethods: GraphViewProviderMethodContainers['plugin'];
  readonly _pluginResourceMethods: GraphViewProviderMethodContainers['pluginResource'];
  readonly _physicsSettingsMethods: GraphViewProviderMethodContainers['physicsSettings'];
  readonly _queryMethods: GraphViewProviderMethodContainers['query'];
  readonly _refreshMethods: GraphViewProviderMethodContainers['refresh'];
  readonly _settingsStateMethods: GraphViewProviderMethodContainers['settingsState'];
  readonly _viewContextMethods: GraphViewProviderMethodContainers['viewContext'];
  readonly _viewSelectionMethods: GraphViewProviderMethodContainers['viewSelection'];
  readonly _webviewMethods: GraphViewProviderMethodContainers['webview'];
}
