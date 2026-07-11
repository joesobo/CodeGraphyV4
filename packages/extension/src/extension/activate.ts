import * as vscode from 'vscode';
import { GraphViewProvider } from './graphViewProvider';
import { registerConfigHandler } from './config/listener';
import { initializeCurrentCodeGraphyConfiguration } from './repoSettings/current';
import { registerCommands } from './commands/register';
import { registerEditorChangeHandler } from './workspaceFiles/editorSync';
import { registerFileWatcher, registerSaveHandler } from './workspaceFiles/refresh/watchers';
import { createCodeGraphyAgentUriHandler } from './agentBridge/uri';
import type { GraphQueryRequest, GraphQueryResult } from '@codegraphy-dev/core';
import { getCodeGraphyConfiguration } from './repoSettings/current';
import { createExtensionDiagnosticLogger } from './diagnostics/logger';
import type { IGraphData } from '../shared/graph/contracts';
import type { WebviewToExtensionMessage } from '../shared/protocol/webviewToExtension';
import { registerPerfScenarioCommand } from './perf/scenarioCommand';
import { registerNativeDecorations } from './nativeDecorations/register';

/** Public API returned by activate() — usable from e2e tests. */
export interface CodeGraphyAPI {
  /** Refresh graph data without clearing the persisted Graph Cache. */
  refresh(): Promise<void>;
  /** Re-send settings and graph controls to the webview. */
  refreshSettings(): void;
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
  registerPlugin(plugin: unknown, options?: { extensionUri?: vscode.Uri | string }): Promise<void>;
  /** Query the current Relationship Graph through @codegraphy-dev/core. */
  queryGraph(request: GraphQueryRequest): GraphQueryResult;
}

export function activate(context: vscode.ExtensionContext): CodeGraphyAPI {
  initializeCurrentCodeGraphyConfiguration(context);
  const diagnostics = createExtensionDiagnosticLogger({
    isEnabled: () => getCodeGraphyConfiguration().get('verboseDiagnostics', false),
  });
  diagnostics.emit({
    area: 'extension.lifecycle',
    event: 'activation-started',
    context: { workspaceFolders: vscode.workspace.workspaceFolders?.length ?? 0 },
  });
  const provider = new GraphViewProvider(context.extensionUri, context);
  const nativeDecorations = registerNativeDecorations(
    context,
    message => provider.sendToWebview(message),
  );
  provider.setNativeDecorationsReplay(() => nativeDecorations.replay());

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
    ),
    vscode.window.registerUriHandler(createCodeGraphyAgentUriHandler(provider))
  );

  registerConfigHandler(context, provider);
  registerEditorChangeHandler(context, provider);
  registerSaveHandler(context, provider);
  registerFileWatcher(context, provider);
  registerCommands(context, provider);
  registerPerfScenarioCommand(context, provider);
  diagnostics.emit({
    area: 'extension.lifecycle',
    event: 'activation-completed',
    context: { registeredWebviewProviders: 2 },
  });

  return {
    refresh: () => provider.refresh(),
    refreshSettings: () => provider.refreshSettings(),
    getGraphData: () => provider.getGraphData(),
    sendToWebview: (message) => provider.sendToWebview(message),
    onWebviewMessage: (handler) => provider.onWebviewMessage(handler),
    dispatchWebviewMessage: (message) => provider.dispatchWebviewMessage(message),
    onExtensionMessage: (handler) => provider.onExtensionMessage(handler),
    registerPlugin: (plugin: unknown, options?: { extensionUri?: vscode.Uri | string }) =>
      provider.registerExternalPlugin(plugin, options),
    queryGraph: (request) => provider.queryGraph(request),
  };
}

export function deactivate(): void {
  // Cleanup if needed
}
