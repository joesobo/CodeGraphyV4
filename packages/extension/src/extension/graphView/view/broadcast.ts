import type * as vscode from 'vscode';
import { getDepthGraphEffectiveDepthLimit, getDepthGraphMaxDepthLimit } from '../../../core/views/depth/view';
import type { IGroup } from '../../../shared/settings/groups';
import type { IViewContext } from '../../../core/views/contracts';
import type { IGraphData } from '../../../shared/graph/types';
import { buildGraphViewLegendsUpdatedMessage } from '../groups/message';

interface SendGraphViewGroupsUpdatedOptions {
  registerPluginRoots: () => void;
  workspaceFolder: vscode.WorkspaceFolder | undefined;
  view: vscode.WebviewView | undefined;
  panels: readonly vscode.WebviewPanel[];
  resolvePluginAssetPath: (assetPath: string, pluginId?: string) => string;
}

export function sendGraphViewAvailableViews(
  viewContext: IViewContext,
  depthMode: boolean,
  rawGraphData: IGraphData,
  defaultDepthLimit: number,
  sendMessage: (message: unknown) => void,
): void {
  const maxDepthLimit = getDepthGraphMaxDepthLimit(rawGraphData, viewContext.focusedFile);
  const depthLimit = getDepthGraphEffectiveDepthLimit(rawGraphData, viewContext);
  sendMessage({
    type: 'DEPTH_MODE_UPDATED',
    payload: { depthMode },
  });
  sendMessage({
    type: 'DEPTH_LIMIT_UPDATED',
    payload: { depthLimit: depthLimit ?? viewContext.depthLimit ?? defaultDepthLimit },
  });
  sendMessage({
    type: 'DEPTH_LIMIT_RANGE_UPDATED',
    payload: { maxDepthLimit },
  });
}

export function sendGraphViewLegendsUpdated(
  groups: IGroup[],
  {
    registerPluginRoots,
    workspaceFolder,
    view,
    panels,
    resolvePluginAssetPath,
  }: SendGraphViewGroupsUpdatedOptions,
  sendMessage: (message: unknown) => void,
): void {
  registerPluginRoots();

  const webview = view?.webview ?? panels[0]?.webview;
  sendMessage(
    buildGraphViewLegendsUpdatedMessage(groups, {
      workspaceFolder,
      asWebviewUri: webview ? uri => webview.asWebviewUri(uri) : undefined,
      resolvePluginAssetPath,
    }),
  );
}
