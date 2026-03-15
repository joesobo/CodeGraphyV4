import type * as vscode from 'vscode';
import type { IGroup } from '../../shared/types';
import type { IViewContext, ViewRegistry } from '../../core/views';
import { mapAvailableViews } from '../graphViewPresentation';
import { buildGraphViewGroupsUpdatedMessage } from './groups';

interface SendGraphViewGroupsUpdatedOptions {
  registerPluginRoots: () => void;
  workspaceFolder: vscode.WorkspaceFolder | undefined;
  view: vscode.WebviewView | undefined;
  panels: readonly vscode.WebviewPanel[];
  resolvePluginAssetPath: (assetPath: string, pluginId?: string) => string;
}

export function sendGraphViewAvailableViews(
  viewRegistry: ViewRegistry,
  viewContext: IViewContext,
  activeViewId: string,
  defaultDepthLimit: number,
  sendMessage: (message: unknown) => void,
): void {
  const availableViews = viewRegistry.getAvailableViews(viewContext);
  const views = mapAvailableViews(availableViews, activeViewId);

  sendMessage({
    type: 'VIEWS_UPDATED',
    payload: { views, activeViewId },
  });
  sendMessage({
    type: 'DEPTH_LIMIT_UPDATED',
    payload: { depthLimit: viewContext.depthLimit ?? defaultDepthLimit },
  });
}

export function sendGraphViewGroupsUpdated(
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
    buildGraphViewGroupsUpdatedMessage(groups, {
      workspaceFolder,
      asWebviewUri: webview ? uri => webview.asWebviewUri(uri) : undefined,
      resolvePluginAssetPath,
    }),
  );
}
