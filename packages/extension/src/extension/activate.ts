import * as vscode from 'vscode';
import { GraphViewProvider } from './graphViewProvider';
import { registerConfigHandler } from './config/listener';
import { registerCommands } from './commands/register';
import { activateInstalledCodeGraphyPlugins } from './pluginActivation/installed';
import {
  registerEditorChangeHandler,
  registerFileWatcher,
  registerSaveHandler,
} from './workspaceFiles/register';
import type { IGraphData } from '../shared/graph/types';

const CODEGRAPHY_EXTENSION_ID = 'codegraphy.codegraphy';

/** Public API returned by activate() — usable from e2e tests. */
export interface CodeGraphyAPI {
  /** Current graph data (nodes + edges) after the last analysis. */
  getGraphData(): IGraphData;
  /** Replace graph data directly for extension-host e2e tests. */
  setGraphData(data: IGraphData): void;
  /** Change the active graph view. Used by extension-host e2e tests. */
  changeView(viewId: string): Promise<void>;
  /** Set the focused file for the active graph view. Used by extension-host e2e tests. */
  setFocusedFile(filePath: string | undefined): void;
  /** Set the depth limit for depth view. Used by extension-host e2e tests. */
  setDepthLimit(depthLimit: number): Promise<void>;
  /** Open the given node using the same preview path as NODE_SELECTED. */
  previewNode(nodeId: string): Promise<void>;
  /** Send a raw message to the webview panel (mirrors extension→webview channel). */
  sendToWebview(message: unknown): void;
  /** Listen for messages sent from the webview. Returns a disposable. */
  onWebviewMessage(handler: (message: unknown) => void): vscode.Disposable;
  /** Register an external v2 plugin. */
  registerPlugin(plugin: unknown, options?: { extensionUri?: vscode.Uri | string }): void;
}

export function activate(context: vscode.ExtensionContext): CodeGraphyAPI {
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
    setGraphData: (data: IGraphData) => {
      const target = provider as unknown as {
        _rawGraphData: IGraphData;
        _graphData: IGraphData;
        _methodContainers: {
          viewContext: {
            _applyViewTransform(): void;
          };
        };
      };

      target._rawGraphData = data;
      target._graphData = data;
      target._methodContainers.viewContext._applyViewTransform();
    },
    changeView: viewId => provider.changeView(viewId),
    setFocusedFile: filePath => provider.setFocusedFile(filePath),
    setDepthLimit: depthLimit => provider.setDepthLimit(depthLimit),
    previewNode: nodeId =>
      (
        provider as unknown as {
          _methodContainers: {
            timeline: { _openSelectedNode(nodeId: string): Promise<void> };
          };
        }
      )._methodContainers.timeline._openSelectedNode(nodeId),
    sendToWebview: (message) => provider.sendToWebview(message),
    onWebviewMessage: (handler) => provider.onWebviewMessage(handler),
    registerPlugin: (plugin: unknown, options?: { extensionUri?: vscode.Uri | string }) =>
      provider.registerExternalPlugin(plugin, options),
  };
}

export function deactivate(): void {
  // Cleanup if needed
}
