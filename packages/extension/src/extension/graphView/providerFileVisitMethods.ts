import * as vscode from 'vscode';
import type { ExtensionToWebviewMessage, IGraphData } from '../../shared/types';
import { AddToExcludeAction } from '../actions';
import { getUndoManager } from '../UndoManager';
import { addGraphViewExcludePatternsWithUndo } from './excludePatterns';
import { sendGraphViewProviderFileInfoMessage } from './fileInfoRequest';
import { sendGraphViewFavorites } from './favorites';
import { getGraphViewVisitCount, incrementGraphViewVisitCount, trackGraphViewFileVisit } from './visitTracking';

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

const DEFAULT_DEPENDENCIES: GraphViewProviderFileVisitMethodDependencies = {
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

export function createGraphViewProviderFileVisitMethods(
  source: GraphViewProviderFileVisitMethodsSource,
  dependencies: GraphViewProviderFileVisitMethodDependencies = DEFAULT_DEPENDENCIES,
): GraphViewProviderFileVisitMethods {
  const _getVisitCount = (filePath: string): number =>
    dependencies.getVisitCount(source._context.workspaceState as never, filePath);

  const readVisitCount = (filePath: string): number => {
    const implementation = source._getVisitCount;
    if (implementation && implementation !== _getVisitCount) {
      return implementation(filePath);
    }

    return _getVisitCount(filePath);
  };

  const _getFileInfo = async (filePath: string): Promise<void> => {
    const state = {
      analyzer: source._analyzer,
      analyzerInitialized: source._analyzerInitialized,
      graphData: source._graphData,
    };

    await dependencies.sendFileInfoMessage(filePath, state, {
      workspaceFolder: dependencies.getWorkspaceFolder(),
      statFile: fileUri => dependencies.statFile(fileUri),
      getVisitCount: nextFilePath => readVisitCount(nextFilePath),
      sendMessage: message => source._sendMessage(message as ExtensionToWebviewMessage),
      logError: (label, error) => dependencies.logError(label, error),
    });

    source._analyzerInitialized = state.analyzerInitialized;
  };

  const _incrementVisitCount = async (filePath: string): Promise<void> => {
    await dependencies.incrementVisitCount(filePath, {
      workspaceState: source._context.workspaceState as never,
      sendMessage: message => source._sendMessage(message as ExtensionToWebviewMessage),
    });
  };

  const trackFileVisitOnGraph = async (filePath: string): Promise<void> => {
    await dependencies.trackFileVisit(filePath, {
      graphData: source._graphData,
      incrementVisitCount: nextFilePath => {
        const implementation = source._incrementVisitCount;
        if (implementation && implementation !== _incrementVisitCount) {
          return implementation(nextFilePath);
        }

        return _incrementVisitCount(nextFilePath);
      },
    });
  };

  const _addToExclude = async (patterns: string[]): Promise<void> => {
    await dependencies.addExcludeWithUndo(patterns, {
      createAction: (nextPatterns, analyzeAndSendData) =>
        dependencies.createAddToExcludeAction(nextPatterns, analyzeAndSendData),
      executeAction: action => dependencies.executeUndoAction(action),
      analyzeAndSendData: () => source._analyzeAndSendData(),
    });
  };

  const _sendFavorites = (): void => {
    dependencies.sendFavorites(
      dependencies.getConfiguration('codegraphy') as never,
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
