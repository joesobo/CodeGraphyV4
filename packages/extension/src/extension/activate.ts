import * as vscode from 'vscode';
import { GraphViewProvider } from './graphViewProvider';
import { registerConfigHandler } from './config/listener';
import { initializeCurrentCodeGraphyConfiguration } from './repoSettings/current';
import { registerCommands } from './commands/register';
import { activateInstalledCodeGraphyPlugins } from './pluginActivation/installed';
import {
  registerEditorChangeHandler,
  registerFileWatcher,
  registerSaveHandler,
} from './workspaceFiles/register';
import type { IGraphData } from '../shared/graph/types';
import type { WebviewToExtensionMessage } from '../shared/protocol/webviewToExtension';

const CODEGRAPHY_EXTENSION_ID = 'codegraphy.codegraphy';

/** Public API returned by activate() — usable from e2e tests. */
export interface CodeGraphyAPI {
  /** Current graph data (nodes + edges) after the last analysis. */
  getGraphData(): IGraphData;
  /** Send a raw message to the webview panel (mirrors extension→webview channel). */
  sendToWebview(message: unknown): void;
  /** Listen for messages sent from the webview. Returns a disposable. */
  onWebviewMessage(handler: (message: unknown) => void): vscode.Disposable;
  /** Simulate a message sent from the webview to the extension host. */
  dispatchWebviewMessage(message: WebviewToExtensionMessage): Promise<void>;
  /** Listen for messages the extension sends to the webview. */
  onExtensionMessage(handler: (message: unknown) => void): vscode.Disposable;
  /** Register an external v2 plugin. */
  registerPlugin(plugin: unknown, options?: { extensionUri?: vscode.Uri | string }): void;
}

export function activate(context: vscode.ExtensionContext): CodeGraphyAPI {
  initializeCurrentCodeGraphyConfiguration(context);
  const provider = new GraphViewProvider(context.extensionUri, context);
  provider.setInstalledPluginActivationPromise(
    activateInstalledCodeGraphyPlugins(vscode.extensions.all, CODEGRAPHY_EXTENSION_ID),
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      GraphViewProvider.viewType,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      }
    ),
    vscode.window.registerWebviewViewProvider(
      GraphViewProvider.timelineViewType,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      }
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
    dispatchWebviewMessage: (message) => provider.dispatchWebviewMessage(message),
    onExtensionMessage: (handler) => provider.onExtensionMessage(handler),
    registerPlugin: (plugin: unknown, options?: { extensionUri?: vscode.Uri | string }) =>
      provider.registerExternalPlugin(plugin, options),
  };
}

export function deactivate(): void {
  // Cleanup if needed
}
