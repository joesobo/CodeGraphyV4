import type * as vscode from 'vscode';
import type { WebviewToExtensionMessage } from '../../../../../shared/protocol/webviewToExtension';
import { dispatchGraphViewPluginMessage } from '../../dispatch/plugin';
import { dispatchGraphViewPrimaryMessage } from '../../dispatch/primary';
import type {
  GraphViewMessageListenerContext,
  WebviewReadyTracking,
} from './contracts';
import {
  getWebviewReadyDelivery,
  handleWebviewReadyMessage,
  markWebviewReadyCompleted,
} from './ready';
import {
  applyGraphViewPluginMessageResult,
  applyGraphViewPrimaryMessageResult,
} from './results';

export function createGraphViewWebviewMessageHandler(
  webview: vscode.Webview,
  context: GraphViewMessageListenerContext,
): (message: WebviewToExtensionMessage) => Promise<void> {
  const webviewReadyTracking: WebviewReadyTracking = { handled: false };

  return async function handleGraphViewWebviewMessage(message: WebviewToExtensionMessage): Promise<void> {
    const isWebviewReadyMessage = message.type === 'WEBVIEW_READY';
    if (isWebviewReadyMessage) {
      const delivery = getWebviewReadyDelivery(message);
      if (await handleWebviewReadyMessage(context, delivery, webviewReadyTracking)) {
        return;
      }
    }

    const primaryResult = await dispatchGraphViewPrimaryMessage(message, {
      ...context,
      asWebviewUri: uri => webview.asWebviewUri(uri),
    });
    if (applyGraphViewPrimaryMessageResult(primaryResult, context)) {
      markWebviewReadyCompleted(webviewReadyTracking, isWebviewReadyMessage);
      return;
    }

    const pluginResult = await dispatchGraphViewPluginMessage(message, context);
    applyGraphViewPluginMessageResult(pluginResult, context);
    if (isWebviewReadyMessage && pluginResult.handled) {
      markWebviewReadyCompleted(webviewReadyTracking, isWebviewReadyMessage);
    }
  };
}
