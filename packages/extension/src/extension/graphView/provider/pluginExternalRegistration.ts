import * as vscode from 'vscode';
import {
  registerGraphViewExternalPlugin,
  type GraphViewExternalPluginRegistrationOptions,
} from '../webview/plugins/registration';
import type { GraphViewProviderPluginBroadcastMethods } from './pluginBroadcasts';
import type { GraphViewProviderPluginMethodsSource } from './plugins';

export interface GraphViewProviderExternalPluginRegistrationDependencies {
  registerExternalPlugin?: typeof registerGraphViewExternalPlugin;
  getWorkspaceFolders?(): readonly vscode.WorkspaceFolder[] | undefined;
}

export const DEFAULT_GRAPH_VIEW_PROVIDER_EXTERNAL_PLUGIN_REGISTRATION_DEPENDENCIES:
  Required<GraphViewProviderExternalPluginRegistrationDependencies> = {
    registerExternalPlugin: registerGraphViewExternalPlugin,
    getWorkspaceFolders: () => vscode.workspace.workspaceFolders,
  };

export function createGraphViewProviderExternalPluginRegistration(
  source: GraphViewProviderPluginMethodsSource,
  dependencies: GraphViewProviderExternalPluginRegistrationDependencies,
  broadcasts: GraphViewProviderPluginBroadcastMethods,
): (plugin: unknown, options?: GraphViewExternalPluginRegistrationOptions) => void {
  const resolved = {
    ...DEFAULT_GRAPH_VIEW_PROVIDER_EXTERNAL_PLUGIN_REGISTRATION_DEPENDENCIES,
    ...dependencies,
  };

  return (plugin: unknown, options?: GraphViewExternalPluginRegistrationOptions): void => {
    resolved.registerExternalPlugin(
      plugin,
      options,
      {
        analyzer: source._analyzer,
        pluginExtensionUris: source._pluginExtensionUris,
        get firstAnalysis() {
          return source._firstAnalysis;
        },
        get readyNotified() {
          return source._webviewReadyNotified;
        },
        get analyzerInitialized() {
          return source._analyzerInitialized;
        },
        get analyzerInitPromise() {
          return source._analyzerInitPromise;
        },
      },
      {
        normalizeExtensionUri: uri => source._normalizeExternalExtensionUri(uri),
        getWorkspaceRoot: () => resolved.getWorkspaceFolders()?.[0]?.uri.fsPath,
        refreshWebviewResourceRoots: () => source._refreshWebviewResourceRoots(),
        sendDepthState: () => broadcasts._sendDepthState(),
        sendPluginStatuses: () => broadcasts._sendPluginStatuses(),
        sendContextMenuItems: () => broadcasts._sendContextMenuItems(),
        sendPluginExporters: () => broadcasts._sendPluginExporters(),
        sendPluginToolbarActions: () => broadcasts._sendPluginToolbarActions(),
        sendPluginWebviewInjections: () => broadcasts._sendPluginWebviewInjections(),
        invalidateTimelineCache: () => source._invalidateTimelineCache(),
        analyzeAndSendData: () => source._analyzeAndSendData(),
      },
    );
  };
}
