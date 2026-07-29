import * as vscode from 'vscode';
import type { IGraphData } from '../../../../shared/graph/contracts';
import {
  buildGraphViewFileInfoPayload,
  type IGraphViewFileInfoPayload,
} from './payload';

interface GraphViewFileInfoOptions {
  workspaceFolder: { uri: vscode.Uri } | undefined;
  statFile(uri: vscode.Uri): PromiseLike<{ size: number; mtime: number }>;
  getPluginNamesForIds?(pluginIds: readonly string[]): readonly string[];
  graphData: IGraphData;
}

export async function loadGraphViewFileInfo(
  filePath: string,
  options: GraphViewFileInfoOptions,
): Promise<IGraphViewFileInfoPayload | undefined> {
  if (!options.workspaceFolder) return undefined;

  const fileUri = vscode.Uri.joinPath(options.workspaceFolder.uri, filePath);
  const stat = await options.statFile(fileUri);
  const pluginIds = getGraphViewFileInfoPluginIds(filePath, options.graphData);
  const pluginNames = pluginIds.length > 0
    ? options.getPluginNamesForIds?.(pluginIds) ?? []
    : [];
  const pluginLabels = pluginNames.length > 0 ? pluginNames : pluginIds;
  const plugin = pluginLabels.length > 0 ? pluginLabels.join(', ') : undefined;

  return buildGraphViewFileInfoPayload(
    filePath,
    stat,
    options.graphData,
    plugin,
  );
}

export function getGraphViewFileInfoPluginIds(
  filePath: string,
  graphData: IGraphData,
): string[] {
  const pluginIds = new Set<string>();

  for (const edge of graphData.edges) {
    if (edge.from !== filePath && edge.to !== filePath) {
      continue;
    }

    for (const source of edge.sources ?? []) {
      if (source.pluginId) {
        pluginIds.add(source.pluginId);
      }
    }
  }

  return [...pluginIds];
}
