import * as vscode from 'vscode';
import type { ExtensionToWebviewMessage } from '../../../shared/protocol/extensionToWebview';
import { getCodeGraphyConfiguration } from '../../repoSettings/current';
import { sendGraphControlsUpdated } from '../controls/send';
import {
  sendGraphViewContextMenuItems,
  sendGraphViewDecorations,
  sendGraphViewPluginExporters,
  sendGraphViewPluginStatuses,
  sendGraphViewPluginToolbarActions,
  sendGraphViewPluginWebviewInjections,
} from '../webview/plugins/assets';
import { sendGraphViewDepthState, sendGraphViewLegendsUpdated } from '../view/broadcast';
import type { GraphViewProviderPluginMethodsSource } from './plugins';

export interface GraphViewProviderPluginBroadcastMethods {
  _sendDepthState(): void;
  _sendGraphControls(): void;
  _sendPluginStatuses(): void;
  _sendDecorations(): void;
  _sendContextMenuItems(): void;
  _sendPluginExporters(): void;
  _sendPluginToolbarActions(): void;
  _sendPluginWebviewInjections(): void;
  _sendGroupsUpdated(): void;
}

export interface GraphViewProviderPluginBroadcastDependencies {
  sendDepthState?: typeof sendGraphViewDepthState;
  sendPluginStatuses?: typeof sendGraphViewPluginStatuses;
  sendDecorations?: typeof sendGraphViewDecorations;
  sendContextMenuItems?: typeof sendGraphViewContextMenuItems;
  sendPluginExporters?: typeof sendGraphViewPluginExporters;
  sendPluginToolbarActions?: typeof sendGraphViewPluginToolbarActions;
  sendPluginWebviewInjections?: typeof sendGraphViewPluginWebviewInjections;
  sendGroupsUpdated?: typeof sendGraphViewLegendsUpdated;
  getWorkspaceFolders?(): readonly vscode.WorkspaceFolder[] | undefined;
}

export const DEFAULT_GRAPH_VIEW_PROVIDER_PLUGIN_BROADCAST_DEPENDENCIES:
  Required<GraphViewProviderPluginBroadcastDependencies> = {
  sendDepthState: sendGraphViewDepthState,
  sendPluginStatuses: sendGraphViewPluginStatuses,
  sendDecorations: sendGraphViewDecorations,
  sendContextMenuItems: sendGraphViewContextMenuItems,
  sendPluginExporters: sendGraphViewPluginExporters,
  sendPluginToolbarActions: sendGraphViewPluginToolbarActions,
  sendPluginWebviewInjections: sendGraphViewPluginWebviewInjections,
  sendGroupsUpdated: sendGraphViewLegendsUpdated,
  getWorkspaceFolders: () => vscode.workspace.workspaceFolders,
};

export function createGraphViewProviderPluginBroadcastMethods(
  source: GraphViewProviderPluginMethodsSource,
  dependencies: GraphViewProviderPluginBroadcastDependencies =
    DEFAULT_GRAPH_VIEW_PROVIDER_PLUGIN_BROADCAST_DEPENDENCIES,
  defaultDepthLimit: number,
): GraphViewProviderPluginBroadcastMethods {
  const resolved: Required<GraphViewProviderPluginBroadcastDependencies> = {
    ...DEFAULT_GRAPH_VIEW_PROVIDER_PLUGIN_BROADCAST_DEPENDENCIES,
    ...dependencies,
  };

  const send = (message: unknown): void => {
    source._sendMessage(message as ExtensionToWebviewMessage);
  };

  return {
    _sendDepthState: () => {
      resolved.sendDepthState(
        source._viewContext,
        source._depthMode,
        source._rawGraphData,
        defaultDepthLimit,
        send,
      );
    },
    _sendGraphControls: () => {
      sendGraphControlsUpdated(
        source._graphData,
        source._analyzer,
        message => send(message),
        getCodeGraphyConfiguration(),
      );
    },
    _sendPluginStatuses: () => {
      resolved.sendPluginStatuses(
        source._analyzer,
        source._disabledSources,
        source._disabledPlugins,
        send,
      );
    },
    _sendDecorations: () => {
      resolved.sendDecorations(source._decorationManager, send);
    },
    _sendContextMenuItems: () => {
      resolved.sendContextMenuItems(source._analyzer, send);
    },
    _sendPluginExporters: () => {
      resolved.sendPluginExporters(source._analyzer, send);
    },
    _sendPluginToolbarActions: () => {
      resolved.sendPluginToolbarActions(source._analyzer, send);
    },
    _sendPluginWebviewInjections: () => {
      resolved.sendPluginWebviewInjections(
        source._analyzer,
        (assetPath, pluginId) => source._resolveWebviewAssetPath(assetPath, pluginId),
        send,
      );
    },
    _sendGroupsUpdated: () => {
      resolved.sendGroupsUpdated(
        source._groups,
        {
          registerPluginRoots: () => source._registerBuiltInPluginRoots(),
          workspaceFolder: resolved.getWorkspaceFolders()?.[0],
          view: source._view ?? source._timelineView,
          panels: source._panels,
          resolvePluginAssetPath: (assetPath, pluginId) =>
            source._resolveWebviewAssetPath(assetPath, pluginId),
        },
        send,
      );
    },
  };
}
