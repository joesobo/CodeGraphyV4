import * as vscode from 'vscode';
import type { IViewContext, ViewRegistry } from '../../core/views';
import {
  DEFAULT_FOLDER_NODE_COLOR,
  type ExtensionToWebviewMessage,
  type IGraphData,
} from '../../shared/types';
import { applyGraphViewTransform } from '../graphViewPresentation';
import { normalizeFolderNodeColor } from '../graphViewSettings';
import { sendGraphViewAvailableViews } from './viewBroadcast';
import { buildGraphViewContext } from './viewContext';
import {
  changeGraphViewView,
  getGraphViewDepthLimit,
  setGraphViewDepthLimit,
  setGraphViewFocusedFile,
} from './viewSelection';

interface GraphViewProviderWorkspaceStateLike {
  get<T>(key: string): T | undefined;
  update(key: string, value: unknown): PromiseLike<void>;
}

interface GraphViewProviderConfigLike {
  get<T>(key: string, defaultValue: T): T;
}

interface GraphViewProviderAnalyzerLike {
  registry: {
    list(): Array<{ plugin?: { id?: string } }>;
  };
}

export interface GraphViewProviderViewMethodsSource {
  _context: { workspaceState: GraphViewProviderWorkspaceStateLike };
  _analyzer?: GraphViewProviderAnalyzerLike;
  _viewRegistry: Pick<ViewRegistry, 'get' | 'isViewAvailable'>;
  _viewContext: IViewContext;
  _activeViewId: string;
  _rawGraphData: IGraphData;
  _graphData: IGraphData;
  _applyViewTransform?(this: void): void;
  _sendAvailableViews?(this: void): void;
  _sendMessage(message: ExtensionToWebviewMessage): void;
}

export interface GraphViewProviderViewMethods {
  _updateViewContext(): void;
  _applyViewTransform(): void;
  _sendAvailableViews(): void;
  updateGraphData(data: IGraphData): void;
  getGraphData(): IGraphData;
  changeView(viewId: string): Promise<void>;
  setFocusedFile(filePath: string | undefined): void;
  setDepthLimit(depthLimit: number): Promise<void>;
  getDepthLimit(): number;
}

export interface GraphViewProviderViewMethodDependencies {
  getConfiguration(section: string): GraphViewProviderConfigLike;
  getWorkspaceFolders(): readonly vscode.WorkspaceFolder[] | undefined;
  getActiveTextEditor(): vscode.TextEditor | undefined;
  asRelativePath(uri: vscode.Uri): string;
  buildViewContext: typeof buildGraphViewContext;
  applyViewTransform: typeof applyGraphViewTransform;
  sendAvailableViews: typeof sendGraphViewAvailableViews;
  changeView: typeof changeGraphViewView;
  setFocusedFile: typeof setGraphViewFocusedFile;
  setDepthLimit: typeof setGraphViewDepthLimit;
  getDepthLimit: typeof getGraphViewDepthLimit;
  normalizeFolderNodeColor: typeof normalizeFolderNodeColor;
  defaultDepthLimit: number;
  defaultFolderNodeColor: string;
  selectedViewKey: string;
  depthLimitKey: string;
  logUnavailableView(viewId: string): void;
}

const DEFAULT_DEPENDENCIES: GraphViewProviderViewMethodDependencies = {
  getConfiguration: section => vscode.workspace.getConfiguration(section),
  getWorkspaceFolders: () => vscode.workspace.workspaceFolders,
  getActiveTextEditor: () => vscode.window.activeTextEditor,
  asRelativePath: uri => vscode.workspace.asRelativePath(uri),
  buildViewContext: buildGraphViewContext,
  applyViewTransform: applyGraphViewTransform,
  sendAvailableViews: sendGraphViewAvailableViews,
  changeView: changeGraphViewView,
  setFocusedFile: setGraphViewFocusedFile,
  setDepthLimit: setGraphViewDepthLimit,
  getDepthLimit: getGraphViewDepthLimit,
  normalizeFolderNodeColor,
  defaultDepthLimit: 1,
  defaultFolderNodeColor: DEFAULT_FOLDER_NODE_COLOR,
  selectedViewKey: 'codegraphy.selectedView',
  depthLimitKey: 'codegraphy.depthLimit',
  logUnavailableView: viewId => {
    console.warn(`[CodeGraphy] View '${viewId}' is not available`);
  },
};

export function createGraphViewProviderViewMethods(
  source: GraphViewProviderViewMethodsSource,
  dependencies: GraphViewProviderViewMethodDependencies = DEFAULT_DEPENDENCIES,
): GraphViewProviderViewMethods {
  const _updateViewContext = (): void => {
    const config = dependencies.getConfiguration('codegraphy');
    source._viewContext = dependencies.buildViewContext({
      analyzer: source._analyzer as never,
      workspaceFolders: dependencies.getWorkspaceFolders(),
      activeEditor: dependencies.getActiveTextEditor(),
      readSavedDepthLimit: () =>
        source._context.workspaceState.get<number>(dependencies.depthLimitKey),
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
      source._viewRegistry as never,
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
      source._viewRegistry as never,
      source._viewContext,
      source._activeViewId,
      dependencies.defaultDepthLimit,
      message => source._sendMessage(message as ExtensionToWebviewMessage),
    );
  };

  const callApplyViewTransform = (): void => {
    const implementation = source._applyViewTransform;
    if (implementation && implementation !== _applyViewTransform) {
      implementation();
      return;
    }

    _applyViewTransform();
  };

  const callSendAvailableViews = (): void => {
    const implementation = source._sendAvailableViews;
    if (implementation && implementation !== _sendAvailableViews) {
      implementation();
      return;
    }

    _sendAvailableViews();
  };

  const updateGraphData = (data: IGraphData): void => {
    source._graphData = data;
    source._sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: source._graphData });
  };

  const getGraphData = (): IGraphData => source._graphData;

  const changeView = async (viewId: string): Promise<void> => {
    await dependencies.changeView(source as never, viewId, {
      isViewAvailable: (nextViewId, viewContext) =>
        source._viewRegistry.isViewAvailable(nextViewId, viewContext),
      persistActiveViewId: async nextViewId => {
        await source._context.workspaceState.update(dependencies.selectedViewKey, nextViewId);
      },
      applyViewTransform: () => callApplyViewTransform(),
      sendAvailableViews: () => callSendAvailableViews(),
      sendMessage: message => source._sendMessage(message as ExtensionToWebviewMessage),
      logUnavailableView: nextViewId => dependencies.logUnavailableView(nextViewId),
    });
  };

  const setFocusedFile = (filePath: string | undefined): void => {
    dependencies.setFocusedFile(source as never, filePath, {
      getActiveViewInfo: nextViewId => source._viewRegistry.get(nextViewId) as never,
      applyViewTransform: () => callApplyViewTransform(),
      sendAvailableViews: () => callSendAvailableViews(),
      sendMessage: message => source._sendMessage(message as ExtensionToWebviewMessage),
    });
  };

  const setDepthLimit = async (depthLimit: number): Promise<void> => {
    await dependencies.setDepthLimit(source as never, depthLimit, {
      persistDepthLimit: async nextDepthLimit => {
        await source._context.workspaceState.update(dependencies.depthLimitKey, nextDepthLimit);
      },
      sendMessage: message => source._sendMessage(message as ExtensionToWebviewMessage),
      getActiveViewInfo: nextViewId => source._viewRegistry.get(nextViewId) as never,
      applyViewTransform: () => callApplyViewTransform(),
    });
  };

  const getDepthLimit = (): number =>
    dependencies.getDepthLimit(source._viewContext, dependencies.defaultDepthLimit);

  return {
    _updateViewContext,
    _applyViewTransform,
    _sendAvailableViews,
    updateGraphData,
    getGraphData,
    changeView,
    setFocusedFile,
    setDepthLimit,
    getDepthLimit,
  };
}
