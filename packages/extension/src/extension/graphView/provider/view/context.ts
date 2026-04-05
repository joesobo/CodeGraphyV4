import * as vscode from 'vscode';
import type { IViewContext } from '../../../../core/views/contracts';
import type { ViewRegistry } from '../../../../core/views/registry';
import { DEFAULT_FOLDER_NODE_COLOR } from '../../../../shared/fileColors';
import type { IGraphData } from '../../../../shared/graph/types';
import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import { applyGraphViewTransform } from '../../presentation';
import { normalizeFolderNodeColor } from '../../settings/reader';
import { sendGraphViewAvailableViews } from '../../view/broadcast';
import { buildGraphViewContext } from '../../view/context';

interface GraphViewProviderWorkspaceStateLike {
  get<T>(key: string): T | undefined;
  update(key: string, value: unknown): PromiseLike<void>;
}

interface GraphViewProviderConfigLike {
  get<T>(key: string, defaultValue: T): T;
}

interface GraphViewProviderAnalyzerLike {
  registry: {
    list(): Array<{ plugin: { id: string } }>;
  };
}

export interface GraphViewProviderViewContextMethodsSource {
  _context: { workspaceState: GraphViewProviderWorkspaceStateLike };
  _analyzer?: GraphViewProviderAnalyzerLike;
  _viewRegistry: ViewRegistry;
  _viewContext: IViewContext;
  _activeViewId: string;
  _rawGraphData: IGraphData;
  _graphData: IGraphData;
  _sendMessage(message: ExtensionToWebviewMessage): void;
}

export interface GraphViewProviderViewContextMethods {
  _updateViewContext(): void;
  _applyViewTransform(): void;
  _sendAvailableViews(): void;
  updateGraphData(data: IGraphData): void;
  getGraphData(): IGraphData;
}

export interface GraphViewProviderViewContextMethodDependencies {
  getConfiguration(section: string): GraphViewProviderConfigLike;
  getWorkspaceFolders(): readonly vscode.WorkspaceFolder[] | undefined;
  getActiveTextEditor(): vscode.TextEditor | undefined;
  asRelativePath(uri: vscode.Uri): string;
  buildViewContext: typeof buildGraphViewContext;
  applyViewTransform: typeof applyGraphViewTransform;
  sendAvailableViews: typeof sendGraphViewAvailableViews;
  normalizeFolderNodeColor: typeof normalizeFolderNodeColor;
  defaultDepthLimit: number;
  defaultFolderNodeColor: string;
  selectedViewKey: string;
}

function createDefaultDependencies(): GraphViewProviderViewContextMethodDependencies {
  return {
    getConfiguration: section => vscode.workspace.getConfiguration(section),
    getWorkspaceFolders: () => vscode.workspace.workspaceFolders,
    getActiveTextEditor: () => vscode.window.activeTextEditor,
    asRelativePath: uri => vscode.workspace.asRelativePath(uri),
    buildViewContext: buildGraphViewContext,
    applyViewTransform: applyGraphViewTransform,
    sendAvailableViews: sendGraphViewAvailableViews,
    normalizeFolderNodeColor,
    defaultDepthLimit: 1,
    defaultFolderNodeColor: DEFAULT_FOLDER_NODE_COLOR,
    selectedViewKey: 'codegraphy.selectedView',
  };
}

export function createGraphViewProviderViewContextMethods(
  source: GraphViewProviderViewContextMethodsSource,
  dependencies: GraphViewProviderViewContextMethodDependencies = createDefaultDependencies(),
): GraphViewProviderViewContextMethods {
  const _updateViewContext = (): void => {
    const config = dependencies.getConfiguration('codegraphy');
    source._viewContext = dependencies.buildViewContext({
      analyzer: source._analyzer,
      workspaceFolders: dependencies.getWorkspaceFolders(),
      activeEditor: dependencies.getActiveTextEditor(),
      readSavedDepthLimit: () => source._context.workspaceState.get<number>('codegraphy.depthLimit'),
      readFolderNodeColor: () =>
        dependencies.normalizeFolderNodeColor(
          config.get<string>('folderNodeColor', dependencies.defaultFolderNodeColor),
        ),
      asRelativePath: uri => dependencies.asRelativePath(uri),
      defaultDepthLimit: dependencies.defaultDepthLimit,
    });
  };

  const _applyViewTransform = (): void => {
    const result = dependencies.applyViewTransform(
      source._viewRegistry,
      source._activeViewId,
      source._viewContext,
      source._rawGraphData,
    );
    source._activeViewId = result.activeViewId;
    source._graphData = result.graphData;

    if (result.persistSelectedViewId) {
      void source._context.workspaceState.update(
        dependencies.selectedViewKey,
        result.persistSelectedViewId,
      );
    }
  };

  const _sendAvailableViews = (): void => {
    dependencies.sendAvailableViews(
      source._viewRegistry,
      source._viewContext,
      source._activeViewId,
      source._rawGraphData,
      dependencies.defaultDepthLimit,
      message => source._sendMessage(message as ExtensionToWebviewMessage),
    );
  };

  const updateGraphData = (data: IGraphData): void => {
    source._graphData = data;
    source._sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: source._graphData });
  };

  const getGraphData = (): IGraphData => source._graphData;

  return {
    _updateViewContext,
    _applyViewTransform,
    _sendAvailableViews,
    updateGraphData,
    getGraphData,
  };
}
