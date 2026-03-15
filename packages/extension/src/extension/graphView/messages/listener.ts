import type * as vscode from 'vscode';
import type { IGroup, WebviewToExtensionMessage } from '../../../shared/types';
import {
  dispatchGraphViewPluginMessage,
  type GraphViewPluginMessageContext,
} from './dispatchPlugin';
import {
  dispatchGraphViewPrimaryMessage,
  type GraphViewPrimaryMessageContext,
} from './dispatchPrimary';

export interface GraphViewMessageListenerContext
  extends GraphViewPrimaryMessageContext,
    GraphViewPluginMessageContext {
  setUserGroups(groups: IGroup[]): void;
  setFilterPatterns(patterns: string[]): void;
  setWebviewReadyNotified(nextValue: boolean): void;
}

export function setGraphViewWebviewMessageListener(
  webview: vscode.Webview,
  context: GraphViewMessageListenerContext,
): void {
  webview.onDidReceiveMessage(async (message: WebviewToExtensionMessage) => {
    const primaryResult = await dispatchGraphViewPrimaryMessage(message, context);
    if (primaryResult.handled) {
      if (primaryResult.userGroups !== undefined) {
        context.setUserGroups(primaryResult.userGroups);
      }
      if (primaryResult.filterPatterns !== undefined) {
        context.setFilterPatterns(primaryResult.filterPatterns);
      }
      return;
    }

    const pluginResult = await dispatchGraphViewPluginMessage(message, context);
    if (pluginResult.handled && pluginResult.webviewReadyNotified !== undefined) {
      context.setWebviewReadyNotified(pluginResult.webviewReadyNotified);
    }
  });
}
