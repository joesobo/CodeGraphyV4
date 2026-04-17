import type * as vscode from 'vscode';
import type { IGraphData } from '../../../../shared/graph/contracts';
import { loadGraphViewFileInfo } from './loader';
import { sendGraphViewFileInfoMessage } from './message';

interface GraphViewFileInfoAnalyzerLike {
  initialize(): Promise<void>;
  getPluginNameForFile(filePath: string): string | undefined;
}

interface GraphViewFileInfoRequestState {
  analyzer: GraphViewFileInfoAnalyzerLike | undefined;
  analyzerInitialized: boolean;
  graphData: IGraphData;
}

interface GraphViewFileInfoLoaderOptions {
  workspaceFolder: vscode.WorkspaceFolder | undefined;
  statFile: (fileUri: vscode.Uri) => PromiseLike<{ size: number; mtime: number }>;
  ensureAnalyzerReady: () => Promise<GraphViewFileInfoAnalyzerLike | undefined>;
  graphData: IGraphData;
  getVisitCount: (filePath: string) => number;
}

interface SendGraphViewProviderFileInfoMessageOptions<TPayload> {
  workspaceFolder: vscode.WorkspaceFolder | undefined;
  statFile: (fileUri: vscode.Uri) => PromiseLike<{ size: number; mtime: number }>;
  getVisitCount: (filePath: string) => number;
  sendMessage: (message: unknown) => void;
  logError: (label: string, error: unknown) => void;
  loadFileInfo?: (
    filePath: string,
    options: GraphViewFileInfoLoaderOptions,
  ) => Promise<TPayload | undefined>;
}

export async function sendGraphViewProviderFileInfoMessage<TPayload>(
  filePath: string,
  state: GraphViewFileInfoRequestState,
  {
    workspaceFolder,
    statFile,
    getVisitCount,
    sendMessage,
    logError,
    loadFileInfo = loadGraphViewFileInfo as (
      filePath: string,
      options: GraphViewFileInfoLoaderOptions,
    ) => Promise<TPayload | undefined>,
  }: SendGraphViewProviderFileInfoMessageOptions<TPayload>,
): Promise<void> {
  await sendGraphViewFileInfoMessage(filePath, {
    loadFileInfo: nextFilePath =>
      loadFileInfo(nextFilePath, {
        workspaceFolder,
        statFile,
        ensureAnalyzerReady: async () => {
          if (state.analyzer && !state.analyzerInitialized) {
            await state.analyzer.initialize();
            state.analyzerInitialized = true;
          }

          return state.analyzer;
        },
        graphData: state.graphData,
        getVisitCount,
      }),
    sendMessage,
    logError,
  });
}
