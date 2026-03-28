import * as vscode from 'vscode';
import type { IViewContext } from '../../../core/views/types';
import type { ViewRegistry } from '../../../core/views/registry';
import type { ExtensionToWebviewMessage, IGroup } from '../../../shared/contracts';
import {
  registerGraphViewExternalPlugin,
  type GraphViewExternalPluginRegistrationOptions,
} from '../plugins/registration';
import {
  sendGraphViewContextMenuItems,
  sendGraphViewDecorations,
  sendGraphViewPluginStatuses,
  sendGraphViewPluginWebviewInjections,
} from '../plugins/webview';
import { sendGraphViewAvailableViews, sendGraphViewGroupsUpdated } from '../view/broadcast';

const DEFAULT_DEPTH_LIMIT = 1;

interface GraphViewPluginAnalyzerLike {
  registry: {
    list(): unknown[];
    getPluginAPI(pluginId: string): unknown;
    register?(plugin: unknown, options: { deferReadinessReplay: boolean }): void;
    initializePlugin?(pluginId: string, workspaceRoot: string): PromiseLike<void>;
    replayReadinessForPlugin?(pluginId: string): void;
  };
  getPluginStatuses?(
    disabledRules: ReadonlySet<string>,
    disabledPlugins: ReadonlySet<string>,
  ): unknown[];
}

interface GraphViewDecorationManagerLike {
  getMergedNodeDecorations(): unknown;
  getMergedEdgeDecorations(): unknown;
}

export interface GraphViewProviderPluginMethodsSource {
  _pluginExtensionUris: Map<string, vscode.Uri>;
  _analyzer?: GraphViewPluginAnalyzerLike;
  _disabledPlugins: Set<string>;
  _disabledRules: Set<string>;
  _groups: IGroup[];
  _view?: vscode.WebviewView;
  _panels: vscode.WebviewPanel[];
  _viewRegistry: ViewRegistry;
  _viewContext: IViewContext;
  _activeViewId: string;
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
  _analyzeAndSendData(): Promise<void>;
}

export interface GraphViewProviderPluginMethods {
  _sendAvailableViews(): void;
  _sendPluginStatuses(): void;
  _sendDecorations(): void;
  _sendContextMenuItems(): void;
  _sendPluginWebviewInjections(): void;
  _sendGroupsUpdated(): void;
  registerExternalPlugin(
    plugin: unknown,
    options?: GraphViewExternalPluginRegistrationOptions,
  ): void;
}

export interface GraphViewProviderPluginMethodDependencies {
  sendAvailableViews: typeof sendGraphViewAvailableViews;
  sendPluginStatuses: typeof sendGraphViewPluginStatuses;
  sendDecorations: typeof sendGraphViewDecorations;
  sendContextMenuItems: typeof sendGraphViewContextMenuItems;
  sendPluginWebviewInjections: typeof sendGraphViewPluginWebviewInjections;
  sendGroupsUpdated: typeof sendGraphViewGroupsUpdated;
  registerExternalPlugin: typeof registerGraphViewExternalPlugin;
  getWorkspaceFolders(): readonly vscode.WorkspaceFolder[] | undefined;
}

const DEFAULT_DEPENDENCIES: GraphViewProviderPluginMethodDependencies = {
  sendAvailableViews: sendGraphViewAvailableViews,
  sendPluginStatuses: sendGraphViewPluginStatuses,
  sendDecorations: sendGraphViewDecorations,
  sendContextMenuItems: sendGraphViewContextMenuItems,
  sendPluginWebviewInjections: sendGraphViewPluginWebviewInjections,
  sendGroupsUpdated: sendGraphViewGroupsUpdated,
  registerExternalPlugin: registerGraphViewExternalPlugin,
  getWorkspaceFolders: () => vscode.workspace.workspaceFolders,
};

export function createGraphViewProviderPluginMethods(
  source: GraphViewProviderPluginMethodsSource,
  dependencies: GraphViewProviderPluginMethodDependencies = DEFAULT_DEPENDENCIES,
): GraphViewProviderPluginMethods {
  const _sendAvailableViews = (): void => {
    dependencies.sendAvailableViews(
      source._viewRegistry,
      source._viewContext,
      source._activeViewId,
      DEFAULT_DEPTH_LIMIT,
      message => source._sendMessage(message as ExtensionToWebviewMessage),
    );
  };

  const _sendPluginStatuses = (): void => {
    dependencies.sendPluginStatuses(
      source._analyzer as never,
      source._disabledRules,
      source._disabledPlugins,
      message => source._sendMessage(message as ExtensionToWebviewMessage),
    );
  };

  const _sendDecorations = (): void => {
    dependencies.sendDecorations(source._decorationManager as never, message =>
      source._sendMessage(message as ExtensionToWebviewMessage),
    );
  };

  const _sendContextMenuItems = (): void => {
    dependencies.sendContextMenuItems(source._analyzer as never, message =>
      source._sendMessage(message as ExtensionToWebviewMessage),
    );
  };

  const _sendPluginWebviewInjections = (): void => {
    dependencies.sendPluginWebviewInjections(
      source._analyzer as never,
      (assetPath, pluginId) => source._resolveWebviewAssetPath(assetPath, pluginId),
      message => source._sendMessage(message as ExtensionToWebviewMessage),
    );
  };

  const _sendGroupsUpdated = (): void => {
    dependencies.sendGroupsUpdated(
      source._groups,
      {
        registerPluginRoots: () => source._registerBuiltInPluginRoots(),
        workspaceFolder: dependencies.getWorkspaceFolders()?.[0],
        view: source._view,
        panels: source._panels,
        resolvePluginAssetPath: (assetPath, pluginId) =>
          source._resolveWebviewAssetPath(assetPath, pluginId),
      },
      message => source._sendMessage(message as ExtensionToWebviewMessage),
    );
  };

  const registerExternalPlugin = (
    plugin: unknown,
    options?: GraphViewExternalPluginRegistrationOptions,
  ): void => {
    dependencies.registerExternalPlugin(
      plugin,
      options,
      {
        analyzer: source._analyzer as never,
        pluginExtensionUris: source._pluginExtensionUris,
        get firstAnalysis() {
          return source._firstAnalysis;
        },
        get webviewReadyNotified() {
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
        getWorkspaceRoot: () => dependencies.getWorkspaceFolders()?.[0]?.uri.fsPath,
        refreshWebviewResourceRoots: () => source._refreshWebviewResourceRoots(),
        sendPluginStatuses: () => _sendPluginStatuses(),
        sendContextMenuItems: () => _sendContextMenuItems(),
        sendPluginWebviewInjections: () => _sendPluginWebviewInjections(),
        analyzeAndSendData: () => source._analyzeAndSendData(),
      },
    );
  };

  return {
    _sendAvailableViews,
    _sendPluginStatuses,
    _sendDecorations,
    _sendContextMenuItems,
    _sendPluginWebviewInjections,
    _sendGroupsUpdated,
    registerExternalPlugin,
  };
}
