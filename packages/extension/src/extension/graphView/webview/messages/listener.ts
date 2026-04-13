import type * as vscode from 'vscode';
import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type { IGroup } from '../../../../shared/settings/groups';
import {
  dispatchGraphViewPluginMessage,
  type GraphViewPluginMessageContext,
} from '../dispatch/plugin';
import {
  dispatchGraphViewPrimaryMessage,
  type GraphViewPrimaryMessageContext,
} from '../dispatch/primary';

export interface GraphViewMessageListenerContext
  extends GraphViewPrimaryMessageContext,
    GraphViewPluginMessageContext {
  reprocessPluginFiles(pluginIds: readonly string[]): Promise<void>;
  setUserGroups(groups: IGroup[]): void;
  setFilterPatterns(patterns: string[]): void;
  setWebviewReadyNotified(nextValue: boolean): void;
}

const webviewMessageListenerDisposables = new WeakMap<vscode.Webview, vscode.Disposable>();

export function setGraphViewWebviewMessageListener(
  webview: vscode.Webview,
  context: GraphViewMessageListenerContext,
): void {
  webviewMessageListenerDisposables.get(webview)?.dispose();

  let webviewReadyHandled = false;

  const listenerDisposable = webview.onDidReceiveMessage(async (message: WebviewToExtensionMessage) => {
    if (message.type === 'WEBVIEW_READY') {
      if (webviewReadyHandled) {
        return;
      }
      webviewReadyHandled = true;
    }

    const primaryResult = await dispatchGraphViewPrimaryMessage(message, context);
    if (primaryResult.handled) {
      if (primaryResult.userGroups !== undefined) {
        context.setUserGroups(primaryResult.userGroups);
        context.recomputeGroups();
        context.sendGroupsUpdated();
      }
      if (primaryResult.filterPatterns !== undefined) {
        context.setFilterPatterns(primaryResult.filterPatterns);
      }
      return;
    }

    const pluginResult = await dispatchGraphViewPluginMessage(message, context);
    if (pluginResult.handled && pluginResult.readyNotified !== undefined) {
      context.setWebviewReadyNotified(pluginResult.readyNotified);
    }
  });

  webviewMessageListenerDisposables.set(webview, listenerDisposable);
}
