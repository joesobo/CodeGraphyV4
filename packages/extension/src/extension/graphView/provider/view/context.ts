import * as vscode from 'vscode';
import type { IViewContext } from '../../../../core/views/contracts';
import type { ViewRegistry } from '../../../../core/views/registry';
import type { IGraphData } from '../../../../shared/graph/types';
import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import { getCodeGraphyConfiguration } from '../../../repoSettings/current';
import { applyGraphViewTransform } from '../../presentation';
import { sendGraphViewDepthState } from '../../view/broadcast';
import { buildGraphViewContext } from '../../view/context';
import { filterDepthGraph } from '../../../../core/views/depth/transform';

interface GraphViewProviderWorkspaceStateLike {
  get<T>(key: string): T | undefined;
}

interface GraphViewProviderConfigLike {
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: unknown, target?: unknown): PromiseLike<void>;
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
  _depthMode: boolean;
  _rawGraphData: IGraphData;
  _graphData: IGraphData;
  _sendMessage(message: ExtensionToWebviewMessage): void;
}

export interface GraphViewProviderViewContextMethods {
  _updateViewContext(): void;
  _applyViewTransform(): void;
  _sendDepthState(): void;
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
  sendDepthState: typeof sendGraphViewDepthState;
  defaultDepthLimit: number;
}

function createDefaultDependencies(): GraphViewProviderViewContextMethodDependencies {
  return {
    getConfiguration: section =>
      section === 'codegraphy'
        ? getCodeGraphyConfiguration()
        : vscode.workspace.getConfiguration(section),
    getWorkspaceFolders: () => vscode.workspace.workspaceFolders,
    getActiveTextEditor: () => vscode.window.activeTextEditor,
    asRelativePath: uri => vscode.workspace.asRelativePath(uri),
    buildViewContext: buildGraphViewContext,
    applyViewTransform: applyGraphViewTransform,
    sendDepthState: sendGraphViewDepthState,
    defaultDepthLimit: 1,
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
      readSavedDepthLimit: () => config.get<number>('depthLimit', dependencies.defaultDepthLimit),
      asRelativePath: uri => dependencies.asRelativePath(uri),
      defaultDepthLimit: dependencies.defaultDepthLimit,
    });
  };

  const _applyViewTransform = (): void => {
    const result = dependencies.applyViewTransform(
      source._viewRegistry,
      source._viewContext,
      source._rawGraphData,
    );
    source._graphData = source._depthMode
      ? filterDepthGraph(result.graphData, source._viewContext)
      : result.graphData;
  };

  const _sendDepthState = (): void => {
    dependencies.sendDepthState(
      source._viewContext,
      source._depthMode,
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
    _sendDepthState,
    updateGraphData,
    getGraphData,
  };
}
