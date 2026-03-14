import * as vscode from 'vscode';
import type {
  ExtensionToWebviewMessage,
  IPluginStatus,
} from '../../shared/types';
import {
  buildGraphViewDecorationPayload,
  collectGraphViewContextMenuItems,
  collectGraphViewWebviewInjections,
} from '../graphViewPluginMessages';
import {
  getGraphViewLocalResourceRoots,
  resolveGraphViewAssetPath,
} from '../graphViewResources';

interface GraphViewPluginRegistry {
  list(): Array<{
    plugin: {
      id: string;
      webviewContributions?: {
        scripts?: string[];
        styles?: string[];
      };
    };
  }>;
  getPluginAPI(pluginId: string):
    | {
        readonly contextMenuItems: ReadonlyArray<{
          label: string;
          when: 'node' | 'edge' | 'both';
          icon?: string;
          group?: string;
        }>;
      }
    | undefined;
}

interface GraphViewPluginAnalyzer {
  getPluginStatuses(
    disabledRules: ReadonlySet<string>,
    disabledPlugins: ReadonlySet<string>,
  ): IPluginStatus[];
  registry: GraphViewPluginRegistry;
}

interface GraphViewDecorationManagerLike {
  getMergedNodeDecorations(): Parameters<typeof buildGraphViewDecorationPayload>[0];
  getMergedEdgeDecorations(): Parameters<typeof buildGraphViewDecorationPayload>[1];
}

export function sendGraphViewPluginStatuses(
  analyzer: Pick<GraphViewPluginAnalyzer, 'getPluginStatuses'> | undefined,
  disabledRules: ReadonlySet<string>,
  disabledPlugins: ReadonlySet<string>,
  sendMessage: (
    message: Extract<ExtensionToWebviewMessage, { type: 'PLUGINS_UPDATED' }>
  ) => void,
): void {
  if (!analyzer) return;

  const plugins = analyzer.getPluginStatuses(disabledRules, disabledPlugins);
  sendMessage({ type: 'PLUGINS_UPDATED', payload: { plugins } });
}

export function sendGraphViewDecorations(
  decorationManager: GraphViewDecorationManagerLike,
  sendMessage: (
    message: Extract<ExtensionToWebviewMessage, { type: 'DECORATIONS_UPDATED' }>
  ) => void,
): void {
  const payload = buildGraphViewDecorationPayload(
    decorationManager.getMergedNodeDecorations(),
    decorationManager.getMergedEdgeDecorations(),
  );
  sendMessage({
    type: 'DECORATIONS_UPDATED',
    payload,
  });
}

export function sendGraphViewContextMenuItems(
  analyzer: Pick<GraphViewPluginAnalyzer, 'registry'> | undefined,
  sendMessage: (
    message: Extract<ExtensionToWebviewMessage, { type: 'CONTEXT_MENU_ITEMS' }>
  ) => void,
): void {
  if (!analyzer) return;

  const items = collectGraphViewContextMenuItems(
    analyzer.registry.list(),
    (pluginId) => analyzer.registry.getPluginAPI(pluginId),
  );
  sendMessage({ type: 'CONTEXT_MENU_ITEMS', payload: { items } });
}

export function sendGraphViewPluginWebviewInjections(
  analyzer: Pick<GraphViewPluginAnalyzer, 'registry'> | undefined,
  resolveAssetPath: (assetPath: string, pluginId?: string) => string,
  sendMessage: (
    message: Extract<ExtensionToWebviewMessage, { type: 'PLUGIN_WEBVIEW_INJECT' }>
  ) => void,
): void {
  if (!analyzer) return;

  const injections = collectGraphViewWebviewInjections(
    analyzer.registry.list(),
    resolveAssetPath,
  );
  for (const injection of injections) {
    sendMessage({
      type: 'PLUGIN_WEBVIEW_INJECT',
      payload: injection,
    });
  }
}

export function resolveGraphViewPluginAssetPath(
  assetPath: string,
  extensionUri: vscode.Uri,
  pluginExtensionUris: ReadonlyMap<string, vscode.Uri>,
  view: vscode.WebviewView | undefined,
  panels: readonly vscode.WebviewPanel[],
  pluginId?: string,
): string {
  const webview = view?.webview ?? panels[0]?.webview;
  return resolveGraphViewAssetPath(
    assetPath,
    extensionUri,
    pluginExtensionUris,
    webview,
    pluginId,
  );
}

export function getGraphViewWebviewResourceRoots(
  extensionUri: vscode.Uri,
  pluginExtensionUris: ReadonlyMap<string, vscode.Uri>,
  workspaceFolders: readonly vscode.WorkspaceFolder[] | undefined,
): vscode.Uri[] {
  return getGraphViewLocalResourceRoots(
    extensionUri,
    pluginExtensionUris,
    workspaceFolders,
  );
}

export function refreshGraphViewResourceRoots(
  view: vscode.WebviewView | undefined,
  panels: readonly vscode.WebviewPanel[],
  localResourceRoots: readonly vscode.Uri[],
): void {
  if (view) {
    view.webview.options = {
      ...view.webview.options,
      localResourceRoots,
    };
  }

  for (const panel of panels) {
    panel.webview.options = {
      ...panel.webview.options,
      localResourceRoots,
    };
  }
}
