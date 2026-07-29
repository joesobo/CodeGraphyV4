import type * as vscode from 'vscode';
import type { IGraphData } from '../../../../shared/graph/contracts';
import { loadGraphViewFileInfo } from './loader';
import { sendGraphViewFileInfoMessage } from './message';

interface GraphViewFileInfoAnalyzerLike {
  getPluginNamesForIds(pluginIds: readonly string[]): string[];
}

interface GraphViewFileInfoRequestState {
  analyzer: GraphViewFileInfoAnalyzerLike | undefined;
  graphData: IGraphData;
}

interface GraphViewFileInfoLoaderOptions {
  workspaceFolder: vscode.WorkspaceFolder | undefined;
  statFile: (fileUri: vscode.Uri) => PromiseLike<{ size: number; mtime: number }>;
  getPluginNamesForIds: (pluginIds: readonly string[]) => readonly string[];
  graphData: IGraphData;
}

interface SendGraphViewProviderFileInfoMessageOptions<TPayload> {
  workspaceFolder: vscode.WorkspaceFolder | undefined;
  statFile: (fileUri: vscode.Uri) => PromiseLike<{ size: number; mtime: number }>;
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
        getPluginNamesForIds: pluginIds =>
          state.analyzer?.getPluginNamesForIds(pluginIds) ?? [],
        graphData: state.graphData,
      }),
    sendMessage,
    logError,
  });
}
