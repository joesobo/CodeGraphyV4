import * as vscode from 'vscode';
import type { IViewContext } from '../../../../core/views/contracts';
import type { ViewRegistry } from '../../../../core/views/registry';
import type { IGraphData } from '../../../../shared/graph/contracts';
import type { ExtensionToWebviewMessage } from '../../../../shared/protocol/extensionToWebview';
import type { IGroup } from '../../../../shared/settings/groups';
import { sendGraphViewPluginWebviewInjections } from '../../webview/plugins/contributionDispatch';
import {
  sendGraphViewDecorations,
  sendGraphViewPluginStatuses,
} from '../../webview/plugins/updates';
import {
  GraphViewProviderPluginBroadcastMethods,
  DEFAULT_GRAPH_VIEW_PROVIDER_PLUGIN_BROADCAST_DEPENDENCIES,
  createGraphViewProviderPluginBroadcastMethods,
} from './broadcasts';

const DEFAULT_DEPTH_LIMIT = 1;

type GraphViewPluginAnalyzerLike =
  NonNullable<Parameters<typeof sendGraphViewPluginWebviewInjections>[0]>
  & NonNullable<Parameters<typeof sendGraphViewPluginStatuses>[0]>;

type GraphViewDecorationManagerLike =
  Parameters<typeof sendGraphViewDecorations>[0];

export interface GraphViewProviderPluginMethodsSource {
  _pluginExtensionUris: Map<string, vscode.Uri>;
  _analyzer?: GraphViewPluginAnalyzerLike;
  _disabledPlugins: Set<string>;
  _groups: IGroup[];
  _view?: vscode.WebviewView;
  _panels: vscode.WebviewPanel[];
  _viewRegistry: ViewRegistry;
  _viewContext: IViewContext;
  _depthMode: boolean;
  _graphData: IGraphData;
  _rawGraphData: IGraphData;
  _decorationManager: GraphViewDecorationManagerLike;
  _registerBuiltInPluginRoots(): void;
  _resolveWebviewAssetPath(assetPath: string, pluginId?: string): string;
  _refreshWebviewResourceRoots(): void;
  _sendMessage(message: ExtensionToWebviewMessage): void;
  _analyzeAndSendData(): Promise<void>;
}

export interface GraphViewProviderPluginMethods {
  _sendDepthState: GraphViewProviderPluginBroadcastMethods['_sendDepthState'];
  _sendGraphControls: GraphViewProviderPluginBroadcastMethods['_sendGraphControls'];
  _sendPluginStatuses: GraphViewProviderPluginBroadcastMethods['_sendPluginStatuses'];
  _sendDecorations: GraphViewProviderPluginBroadcastMethods['_sendDecorations'];
  _sendPluginWebviewInjections: GraphViewProviderPluginBroadcastMethods['_sendPluginWebviewInjections'];
  _sendGroupsUpdated: GraphViewProviderPluginBroadcastMethods['_sendGroupsUpdated'];
}
export type GraphViewProviderPluginMethodDependencies =
  import('./broadcasts').GraphViewProviderPluginBroadcastDependencies;

const DEFAULT_DEPENDENCIES: GraphViewProviderPluginMethodDependencies = {
  ...DEFAULT_GRAPH_VIEW_PROVIDER_PLUGIN_BROADCAST_DEPENDENCIES,
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
  return broadcasts;
}
