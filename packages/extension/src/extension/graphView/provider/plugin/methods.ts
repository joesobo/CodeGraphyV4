import * as vscode from 'vscode';
import type { IViewContext } from '../../../../core/views/contracts';
import type { ViewRegistry } from '../../../../core/views/registry';
import type { IGraphData } from '../../../../shared/graph/types';
import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import type { IGroup } from '../../../../shared/settings/groups';
import {
  type GraphViewExternalPluginRegistrationOptions,
} from '../../webview/plugins/registration/register';
import {
  sendGraphViewContextMenuItems,
} from '../../webview/plugins/contributionDispatch';
import {
  sendGraphViewDecorations,
  sendGraphViewPluginStatuses,
} from '../../webview/plugins/updates';
import {
  GraphViewProviderPluginBroadcastMethods,
  DEFAULT_GRAPH_VIEW_PROVIDER_PLUGIN_BROADCAST_DEPENDENCIES,
  createGraphViewProviderPluginBroadcastMethods,
} from './broadcasts';
import {
  DEFAULT_GRAPH_VIEW_PROVIDER_EXTERNAL_PLUGIN_REGISTRATION_DEPENDENCIES,
  createGraphViewProviderExternalPluginRegistration,
} from './externalRegistration';

const DEFAULT_DEPTH_LIMIT = 1;

type GraphViewPluginAnalyzerLike =
  NonNullable<
    Parameters<typeof import('../../webview/plugins/registration/register').registerGraphViewExternalPlugin>[2]['analyzer']
  >
  & NonNullable<Parameters<typeof sendGraphViewContextMenuItems>[0]>
  & NonNullable<Parameters<typeof sendGraphViewPluginStatuses>[0]>;

type GraphViewDecorationManagerLike =
  Parameters<typeof sendGraphViewDecorations>[0];

export interface GraphViewProviderPluginMethodsSource {
  _pluginExtensionUris: Map<string, vscode.Uri>;
  _analyzer?: GraphViewPluginAnalyzerLike;
  _disabledPlugins: Set<string>;
  _groups: IGroup[];
  _view?: vscode.WebviewView;
  _timelineView?: vscode.WebviewView;
  _panels: vscode.WebviewPanel[];
  _viewRegistry: ViewRegistry;
  _viewContext: IViewContext;
  _depthMode: boolean;
  _graphData: IGraphData;
  _rawGraphData: IGraphData;
  _decorationManager: GraphViewDecorationManagerLike;
  _firstAnalysis: boolean;
  _webviewReadyNotified: boolean;
  _analyzerInitialized: boolean;
  _analyzerInitPromise?: Promise<void>;
  _registerBuiltInPluginRoots(): void;
  _resolveWebviewAssetPath(assetPath: string, pluginId?: string): string;
  _refreshWebviewResourceRoots(): void;
  _normalizeExternalExtensionUri(
    uri: vscode.Uri | string | undefined,
  ): vscode.Uri | undefined;
  _sendMessage(message: ExtensionToWebviewMessage): void;
  _invalidateTimelineCache(): Promise<void>;
  _analyzeAndSendData(): Promise<void>;
}

export interface GraphViewProviderPluginMethods {
  _sendDepthState: GraphViewProviderPluginBroadcastMethods['_sendDepthState'];
  _sendGraphControls: GraphViewProviderPluginBroadcastMethods['_sendGraphControls'];
  _sendPluginStatuses: GraphViewProviderPluginBroadcastMethods['_sendPluginStatuses'];
  _sendDecorations: GraphViewProviderPluginBroadcastMethods['_sendDecorations'];
  _sendContextMenuItems: GraphViewProviderPluginBroadcastMethods['_sendContextMenuItems'];
  _sendPluginExporters: GraphViewProviderPluginBroadcastMethods['_sendPluginExporters'];
  _sendPluginToolbarActions: GraphViewProviderPluginBroadcastMethods['_sendPluginToolbarActions'];
  _sendPluginWebviewInjections: GraphViewProviderPluginBroadcastMethods['_sendPluginWebviewInjections'];
  _sendGroupsUpdated: GraphViewProviderPluginBroadcastMethods['_sendGroupsUpdated'];
  registerExternalPlugin(
    plugin: unknown,
    options?: GraphViewExternalPluginRegistrationOptions,
  ): void;
}
export type GraphViewProviderPluginMethodDependencies =
  import('./broadcasts').GraphViewProviderPluginBroadcastDependencies
  & import('./externalRegistration').GraphViewProviderExternalPluginRegistrationDependencies;

const DEFAULT_DEPENDENCIES: GraphViewProviderPluginMethodDependencies = {
  ...DEFAULT_GRAPH_VIEW_PROVIDER_PLUGIN_BROADCAST_DEPENDENCIES,
  ...DEFAULT_GRAPH_VIEW_PROVIDER_EXTERNAL_PLUGIN_REGISTRATION_DEPENDENCIES,
};

export function createGraphViewProviderPluginMethods(
  source: GraphViewProviderPluginMethodsSource,
  dependencies: GraphViewProviderPluginMethodDependencies = DEFAULT_DEPENDENCIES,
): GraphViewProviderPluginMethods {
  const broadcasts = createGraphViewProviderPluginBroadcastMethods(
    source,
    dependencies,
    DEFAULT_DEPTH_LIMIT,
  );
  const registerExternalPlugin = createGraphViewProviderExternalPluginRegistration(
    source,
    dependencies,
    broadcasts,
  );

  return {
    ...broadcasts,
    registerExternalPlugin,
  };
}
