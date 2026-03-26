import * as vscode from 'vscode';
import type { ExtensionToWebviewMessage, IGraphData } from '../../../shared/contracts';
import { AddToExcludeAction } from '../../actions/addToExclude';
import { getUndoManager } from '../../undoManager';
import { addGraphViewExcludePatternsWithUndo } from '../excludePatterns';
import { sendGraphViewProviderFileInfoMessage } from '../fileInfo/request';
import { sendGraphViewFavorites } from '../favorites';
import { getGraphViewVisitCount, incrementGraphViewVisitCount, trackGraphViewFileVisit } from '../visits/tracking';

interface GraphViewProviderFileInfoAnalyzerLike {
  initialize(): Promise<void>;
  getPluginNameForFile(filePath: string): string | undefined;
}

interface GraphViewProviderFileVisitWorkspaceStateLike {
  get<T>(key: string): T | undefined;
  update(key: string, value: unknown): PromiseLike<void>;
}

interface GraphViewProviderFavoritesConfigLike {
  get<T>(key: string, defaultValue: T): T;
}

export interface GraphViewProviderFileVisitMethodsSource {
  _context: { workspaceState: GraphViewProviderFileVisitWorkspaceStateLike };
  _analyzer?: GraphViewProviderFileInfoAnalyzerLike;
  _analyzerInitialized: boolean;
  _graphData: IGraphData;
  _sendMessage(message: ExtensionToWebviewMessage): void;
  _analyzeAndSendData(): Promise<void>;
  _getVisitCount?(this: void, filePath: string): number;
  _incrementVisitCount?(this: void, filePath: string): Promise<void>;
}

export interface GraphViewProviderFileVisitMethods {
  _getFileInfo(filePath: string): Promise<void>;
  _getVisitCount(filePath: string): number;
  _incrementVisitCount(filePath: string): Promise<void>;
  trackFileVisit(filePath: string): Promise<void>;
  _addToExclude(patterns: string[]): Promise<void>;
  _sendFavorites(): void;
}

export interface GraphViewProviderFileVisitMethodDependencies {
  getWorkspaceFolder(): vscode.WorkspaceFolder | undefined;
  getConfiguration(section: string): GraphViewProviderFavoritesConfigLike;
  statFile(fileUri: vscode.Uri): PromiseLike<{ size: number; mtime: number }>;
  sendFileInfoMessage: typeof sendGraphViewProviderFileInfoMessage;
  getVisitCount: typeof getGraphViewVisitCount;
  incrementVisitCount: typeof incrementGraphViewVisitCount;
  trackFileVisit: typeof trackGraphViewFileVisit;
  sendFavorites: typeof sendGraphViewFavorites;
  addExcludeWithUndo: typeof addGraphViewExcludePatternsWithUndo;
  createAddToExcludeAction: (patterns: string[], analyzeAndSendData: () => Promise<void>) => unknown;
  executeUndoAction(action: unknown): Promise<void>;
  logError(label: string, error: unknown): void;
}

function createDefaultGraphViewProviderFileVisitMethodDependencies(): GraphViewProviderFileVisitMethodDependencies {
  return {
    getWorkspaceFolder: () => vscode.workspace.workspaceFolders?.[0],
    getConfiguration: section => vscode.workspace.getConfiguration(section),
    statFile: fileUri => vscode.workspace.fs.stat(fileUri),
    sendFileInfoMessage: sendGraphViewProviderFileInfoMessage,
    getVisitCount: getGraphViewVisitCount,
    incrementVisitCount: incrementGraphViewVisitCount,
    trackFileVisit: trackGraphViewFileVisit,
    sendFavorites: sendGraphViewFavorites,
    addExcludeWithUndo: addGraphViewExcludePatternsWithUndo,
    createAddToExcludeAction: (patterns, analyzeAndSendData) =>
      new AddToExcludeAction(patterns, analyzeAndSendData),
    executeUndoAction: action => getUndoManager().execute(action as never),
    logError: (label, error) => {
      console.error(label, error);
    },
  };
}

export function createGraphViewProviderFileVisitMethods(
  source: GraphViewProviderFileVisitMethodsSource,
  dependencies?: GraphViewProviderFileVisitMethodDependencies,
): GraphViewProviderFileVisitMethods {
  const resolvedDependencies =
    dependencies ?? createDefaultGraphViewProviderFileVisitMethodDependencies();
  const getVisitCountOverride = source._getVisitCount;
  const incrementVisitCountOverride = source._incrementVisitCount;

  const _getVisitCount = (filePath: string): number =>
    resolvedDependencies.getVisitCount(source._context.workspaceState as never, filePath);

  const _getFileInfo = async (filePath: string): Promise<void> => {
    const state = {
      analyzer: source._analyzer,
      analyzerInitialized: source._analyzerInitialized,
      graphData: source._graphData,
    };

    await resolvedDependencies.sendFileInfoMessage(filePath, state, {
      workspaceFolder: resolvedDependencies.getWorkspaceFolder(),
      statFile: fileUri => resolvedDependencies.statFile(fileUri),
      getVisitCount: nextFilePath =>
        (getVisitCountOverride ?? _getVisitCount)(nextFilePath),
      sendMessage: message => source._sendMessage(message as ExtensionToWebviewMessage),
      logError: (label, error) => resolvedDependencies.logError(label, error),
    });

    source._analyzerInitialized = state.analyzerInitialized;
  };

  const _incrementVisitCount = async (filePath: string): Promise<void> => {
    await resolvedDependencies.incrementVisitCount(filePath, {
      workspaceState: source._context.workspaceState as never,
      sendMessage: message => source._sendMessage(message as ExtensionToWebviewMessage),
    });
  };

  const trackFileVisitOnGraph = async (filePath: string): Promise<void> => {
    await resolvedDependencies.trackFileVisit(filePath, {
      graphData: source._graphData,
      incrementVisitCount: nextFilePath =>
        (incrementVisitCountOverride ?? _incrementVisitCount)(nextFilePath),
    });
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
      resolvedDependencies.getConfiguration('codegraphy') as never,
      message => source._sendMessage(message as ExtensionToWebviewMessage),
    );
  };

  const methods: GraphViewProviderFileVisitMethods = {
    _getFileInfo,
    _getVisitCount,
    _incrementVisitCount,
    trackFileVisit: trackFileVisitOnGraph,
    _addToExclude,
    _sendFavorites,
  };

  Object.assign(source as object, methods);

  return methods;
}
