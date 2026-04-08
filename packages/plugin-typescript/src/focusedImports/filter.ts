import type { IGraphData, IViewContext } from '@codegraphy-vscode/plugin-api';
import { filterPluginImportGraph } from './importGraph';
import { projectFocusedImportGraph } from './project';
import { buildUndirectedAdjacencyList, walkDepthFromNode } from './traversal';

export function filterFocusedImportGraph(
  data: IGraphData,
  context: IViewContext,
  pluginId: string,
): IGraphData {
  const importGraph = filterPluginImportGraph(data, pluginId);
  const focusedFile = context.focusedFile;
  if (!focusedFile) {
    return importGraph;
  }

  const adjacencyList = buildUndirectedAdjacencyList(importGraph);
  const depthLimit = Math.max(1, context.depthLimit ?? 1);
  const depths = walkDepthFromNode(focusedFile, depthLimit, adjacencyList);
  return projectFocusedImportGraph(importGraph, depths);
}
