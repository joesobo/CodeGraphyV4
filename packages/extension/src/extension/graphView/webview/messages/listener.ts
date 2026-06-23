import type * as vscode from 'vscode';
import type { GraphViewMessageListenerContext } from './webviewListener/contracts';
import { createGraphViewWebviewMessageHandler } from './webviewListener/handler';

export type { GraphViewMessageListenerContext } from './webviewListener/contracts';

const webviewMessageListenerDisposables = new WeakMap<vscode.Webview, vscode.Disposable>();

export function setGraphViewWebviewMessageListener(
  webview: vscode.Webview,
  context: GraphViewMessageListenerContext,
): void {
  webviewMessageListenerDisposables.get(webview)?.dispose();
  const listenerDisposable = webview.onDidReceiveMessage(
    createGraphViewWebviewMessageHandler(webview, context),
  );
  webviewMessageListenerDisposables.set(webview, listenerDisposable);
}
