import type * as vscode from 'vscode';
import type { IViewContext } from '../../core/views';
import { getRelativeWorkspacePath } from '../graphViewPresentation';

interface GraphViewPluginInfoLike {
  plugin?: {
    id?: string;
  };
}

interface GraphViewAnalyzerLike {
  registry: {
    list(): GraphViewPluginInfoLike[];
  };
}

interface BuildGraphViewContextOptions {
  analyzer: GraphViewAnalyzerLike | undefined;
  workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined;
  activeEditor: vscode.TextEditor | undefined;
  readSavedDepthLimit: () => number | undefined;
  readFolderNodeColor: () => string;
  asRelativePath: (uri: vscode.Uri) => string;
  defaultDepthLimit: number;
}

export function getGraphViewActivePluginIds(
  analyzer: GraphViewAnalyzerLike | undefined,
): Set<string> {
  const pluginIds = new Set<string>();
  if (!analyzer) return pluginIds;

  for (const info of analyzer.registry.list()) {
    if (info.plugin?.id) {
      pluginIds.add(info.plugin.id);
    }
  }

  return pluginIds;
}

export function getGraphViewRelativePath(
  uri: vscode.Uri,
  workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined,
  asRelativePath: (uri: vscode.Uri) => string,
): string | undefined {
  return getRelativeWorkspacePath(uri, workspaceFolders, asRelativePath);
}

export function buildGraphViewContext({
  analyzer,
  workspaceFolders,
  activeEditor,
  readSavedDepthLimit,
  readFolderNodeColor,
  asRelativePath,
  defaultDepthLimit,
}: BuildGraphViewContextOptions): IViewContext {
  const workspaceFolder = workspaceFolders?.[0];

  return {
    activePlugins: getGraphViewActivePluginIds(analyzer),
    workspaceRoot: workspaceFolder?.uri.fsPath,
    focusedFile: activeEditor
      ? getGraphViewRelativePath(activeEditor.document.uri, workspaceFolders, asRelativePath)
      : undefined,
    depthLimit: readSavedDepthLimit() ?? defaultDepthLimit,
    folderNodeColor: readFolderNodeColor(),
  };
}
