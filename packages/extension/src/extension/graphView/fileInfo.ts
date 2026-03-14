import * as vscode from 'vscode';
import type { IGraphData } from '../../shared/types';
import {
  buildGraphViewFileInfoPayload,
  type IGraphViewFileInfoPayload,
} from '../graphViewFileInfo';

interface GraphViewFileInfoAnalyzer {
  getPluginNameForFile(filePath: string): string | undefined;
}

interface GraphViewFileInfoOptions {
  workspaceFolder: { uri: vscode.Uri } | undefined;
  statFile(uri: vscode.Uri): PromiseLike<{ size: number; mtime: number }>;
  ensureAnalyzerReady(): PromiseLike<GraphViewFileInfoAnalyzer | undefined>;
  graphData: IGraphData;
  getVisitCount(filePath: string): number;
}

export async function loadGraphViewFileInfo(
  filePath: string,
  options: GraphViewFileInfoOptions,
): Promise<IGraphViewFileInfoPayload | undefined> {
  if (!options.workspaceFolder) return undefined;

  const fileUri = vscode.Uri.joinPath(options.workspaceFolder.uri, filePath);
  const stat = await options.statFile(fileUri);
  const analyzer = await options.ensureAnalyzerReady();
  const plugin = analyzer?.getPluginNameForFile(filePath);
  const visits = options.getVisitCount(filePath);

  return buildGraphViewFileInfoPayload(
    filePath,
    stat,
    options.graphData,
    plugin,
    visits,
  );
}
