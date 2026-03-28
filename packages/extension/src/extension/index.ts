import * as vscode from 'vscode';
import { GraphViewProvider } from './graphViewProvider';
import { registerConfigHandler } from './configListener';
import { registerCommands } from './commandRegistration';
import { registerEditorChangeHandler, registerSaveHandler, registerFileWatcher } from './fileSystemListeners';
import type { IGraphData } from '../shared/contracts';

/** Public API returned by activate() — usable from e2e tests. */
export interface CodeGraphyAPI {
  /** Current graph data (nodes + edges) after the last analysis. */
  getGraphData(): IGraphData;
  /** Send a raw message to the webview panel (mirrors extension→webview channel). */
  sendToWebview(message: unknown): void;
  /** Listen for messages sent from the webview. Returns a disposable. */
  onWebviewMessage(handler: (message: unknown) => void): vscode.Disposable;
  /** Register an external v2 plugin. */
  registerPlugin(plugin: unknown, options?: { extensionUri?: vscode.Uri | string }): void;
}

export function activate(context: vscode.ExtensionContext): CodeGraphyAPI {
  const provider = new GraphViewProvider(context.extensionUri, context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      GraphViewProvider.viewType,
      provider
    )
  );

  registerConfigHandler(context, provider);
  registerEditorChangeHandler(context, provider);
  registerSaveHandler(context, provider);
  registerFileWatcher(context, provider);
  registerCommands(context, provider);

  return {
    getGraphData: () => provider.getGraphData(),
    sendToWebview: (message) => provider.sendToWebview(message),
    onWebviewMessage: (handler) => provider.onWebviewMessage(handler),
    registerPlugin: (plugin: unknown, options?: { extensionUri?: vscode.Uri | string }) =>
      provider.registerExternalPlugin(plugin, options),
  };
}

export function deactivate(): void {
  // Cleanup if needed
}
