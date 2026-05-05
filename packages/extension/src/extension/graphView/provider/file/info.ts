import * as vscode from 'vscode';
import type { IGraphData } from '../../../../shared/graph/contracts';
import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import { AddToExcludeAction } from '../../../actions/addToExclude';
import { getUndoManager } from '../../../undoManager';
import type { IUndoableAction } from '../../../undoManager';
import { addGraphViewExcludePatternsWithUndo } from '../../excludePatterns';
import { sendGraphViewProviderFileInfoMessage } from '../../files/info/request';
import { sendGraphViewFavorites } from '../../favorites';

interface GraphViewProviderFileInfoAnalyzerLike {
  initialize(): Promise<void>;
  getPluginNameForFile(filePath: string): string | undefined;
}

interface GraphViewProviderFavoritesConfigLike {
  get<T>(key: string, defaultValue: T): T;
}

export interface GraphViewProviderFileInfoMethodsSource {
  _analyzer?: GraphViewProviderFileInfoAnalyzerLike;
  _analyzerInitialized: boolean;
  _graphData: IGraphData;
  _sendMessage(message: ExtensionToWebviewMessage): void;
  _analyzeAndSendData(): Promise<void>;
}

export interface GraphViewProviderFileInfoMethods {
  _getFileInfo(filePath: string): Promise<void>;
  _addToExclude(patterns: string[]): Promise<void>;
  _sendFavorites(): void;
}

export interface GraphViewProviderFileInfoMethodDependencies {
  getWorkspaceFolder(): vscode.WorkspaceFolder | undefined;
  getConfiguration(section: string): GraphViewProviderFavoritesConfigLike;
  statFile(fileUri: vscode.Uri): PromiseLike<{ size: number; mtime: number }>;
  sendFileInfoMessage: typeof sendGraphViewProviderFileInfoMessage;
  sendFavorites: typeof sendGraphViewFavorites;
  addExcludeWithUndo: typeof addGraphViewExcludePatternsWithUndo;
  createAddToExcludeAction: (
    patterns: string[],
    analyzeAndSendData: () => Promise<void>,
  ) => IUndoableAction;
  executeUndoAction(action: IUndoableAction): Promise<void>;
  logError(label: string, error: unknown): void;
}

function createDefaultGraphViewProviderFileInfoMethodDependencies(): GraphViewProviderFileInfoMethodDependencies {
  return {
    getWorkspaceFolder: () => vscode.workspace.workspaceFolders?.[0],
    getConfiguration: section => vscode.workspace.getConfiguration(section),
    statFile: fileUri => vscode.workspace.fs.stat(fileUri),
    sendFileInfoMessage: sendGraphViewProviderFileInfoMessage,
    sendFavorites: sendGraphViewFavorites,
    addExcludeWithUndo: addGraphViewExcludePatternsWithUndo,
    createAddToExcludeAction: (patterns, analyzeAndSendData) =>
      new AddToExcludeAction(patterns, analyzeAndSendData),
    executeUndoAction: action => getUndoManager().execute(action),
    logError: (label, error) => {
      console.error(label, error);
    },
  };
}

export function createGraphViewProviderFileInfoMethods(
  source: GraphViewProviderFileInfoMethodsSource,
  dependencies?: GraphViewProviderFileInfoMethodDependencies,
): GraphViewProviderFileInfoMethods {
  const resolvedDependencies =
    dependencies ?? createDefaultGraphViewProviderFileInfoMethodDependencies();

  const _getFileInfo = async (filePath: string): Promise<void> => {
    const state = {
      analyzer: source._analyzer,
      analyzerInitialized: source._analyzerInitialized,
      graphData: source._graphData,
    };

    await resolvedDependencies.sendFileInfoMessage(filePath, state, {
      workspaceFolder: resolvedDependencies.getWorkspaceFolder(),
      statFile: fileUri => resolvedDependencies.statFile(fileUri),
      sendMessage: message => source._sendMessage(message as ExtensionToWebviewMessage),
      logError: (label, error) => resolvedDependencies.logError(label, error),
    });

    source._analyzerInitialized = state.analyzerInitialized;
  };

  const _addToExclude = async (patterns: string[]): Promise<void> => {
    await resolvedDependencies.addExcludeWithUndo(patterns, {
      createAction: (nextPatterns, analyzeAndSendData) =>
        resolvedDependencies.createAddToExcludeAction(nextPatterns, analyzeAndSendData),
      executeAction: action => resolvedDependencies.executeUndoAction(action),
      analyzeAndSendData: () => source._analyzeAndSendData(),
    });
  };

  const _sendFavorites = (): void => {
    resolvedDependencies.sendFavorites(
      resolvedDependencies.getConfiguration('codegraphy'),
      message => source._sendMessage(message as ExtensionToWebviewMessage),
    );
  };

  const methods: GraphViewProviderFileInfoMethods = {
    _getFileInfo,
    _addToExclude,
    _sendFavorites,
  };

  return methods;
}
