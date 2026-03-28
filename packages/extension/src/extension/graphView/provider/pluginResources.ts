import * as vscode from 'vscode';
import type { IGroup } from '../../../shared/contracts';
import { getBuiltInGraphViewDefaultGroups } from '../groups/defaults/builtIn';
import { registerBuiltInGraphViewPluginRoots } from '../groups/defaults/pluginRoots';
import { buildGraphViewMergedGroups } from '../groups/merged';
import { getGraphViewPluginDefaultGroups } from '../groups/defaults/plugin';
import {
  getGraphViewWebviewResourceRoots,
  refreshGraphViewResourceRoots,
  resolveGraphViewPluginAssetPath,
} from '../plugins/webview';
import { normalizeGraphViewExtensionUri } from '../resources';

export interface GraphViewProviderPluginResourceMethodsSource {
  _extensionUri: vscode.Uri;
  _pluginExtensionUris: Map<string, vscode.Uri>;
  _analyzer?: {
    registry: {
      list(): unknown[];
    };
  };
  _disabledPlugins: Set<string>;
  _userGroups: IGroup[];
  _hiddenPluginGroupIds: Set<string>;
  _groups: IGroup[];
  _view?: vscode.WebviewView;
  _panels: vscode.WebviewPanel[];
}

export interface GraphViewProviderPluginResourceMethods {
  _registerBuiltInPluginRoots(): void;
  _getPluginDefaultGroups(): IGroup[];
  _getBuiltInDefaultGroups(): IGroup[];
  _computeMergedGroups(): void;
  _resolveWebviewAssetPath(assetPath: string, pluginId?: string): string;
  _getLocalResourceRoots(): vscode.Uri[];
  _refreshWebviewResourceRoots(): void;
  _normalizeExternalExtensionUri(
    uri: vscode.Uri | string | undefined,
  ): vscode.Uri | undefined;
}

export interface GraphViewProviderPluginResourceMethodDependencies {
  registerBuiltInPluginRoots: typeof registerBuiltInGraphViewPluginRoots;
  getPluginDefaultGroups: typeof getGraphViewPluginDefaultGroups;
  getBuiltInDefaultGroups: typeof getBuiltInGraphViewDefaultGroups;
  buildMergedGroups: typeof buildGraphViewMergedGroups;
  resolvePluginAssetPath: typeof resolveGraphViewPluginAssetPath;
  getWebviewResourceRoots: typeof getGraphViewWebviewResourceRoots;
  refreshWebviewResourceRoots: typeof refreshGraphViewResourceRoots;
  normalizeExtensionUri: typeof normalizeGraphViewExtensionUri;
  getWorkspaceFolders(): readonly vscode.WorkspaceFolder[] | undefined;
}

function createDefaultGraphViewProviderPluginResourceMethodDependencies(): GraphViewProviderPluginResourceMethodDependencies {
  return {
    registerBuiltInPluginRoots: registerBuiltInGraphViewPluginRoots,
    getPluginDefaultGroups: getGraphViewPluginDefaultGroups,
    getBuiltInDefaultGroups: getBuiltInGraphViewDefaultGroups,
    buildMergedGroups: buildGraphViewMergedGroups,
    resolvePluginAssetPath: resolveGraphViewPluginAssetPath,
    getWebviewResourceRoots: getGraphViewWebviewResourceRoots,
    refreshWebviewResourceRoots: refreshGraphViewResourceRoots,
    normalizeExtensionUri: normalizeGraphViewExtensionUri,
    getWorkspaceFolders: () => vscode.workspace.workspaceFolders,
  };
}

export function createGraphViewProviderPluginResourceMethods(
  source: GraphViewProviderPluginResourceMethodsSource,
  dependencies?: GraphViewProviderPluginResourceMethodDependencies,
): GraphViewProviderPluginResourceMethods {
  const resolvedDependencies =
    dependencies ?? createDefaultGraphViewProviderPluginResourceMethodDependencies();
  const _registerBuiltInPluginRoots = (): void => {
    resolvedDependencies.registerBuiltInPluginRoots(source._extensionUri, source._pluginExtensionUris);
  };

  const _getPluginDefaultGroups = (): IGroup[] =>
    resolvedDependencies.getPluginDefaultGroups(
      source._analyzer as never,
      source._disabledPlugins,
      source._pluginExtensionUris,
      source._extensionUri,
    );

  const _getBuiltInDefaultGroups = (): IGroup[] => resolvedDependencies.getBuiltInDefaultGroups();

  const _computeMergedGroups = (): void => {
    source._groups = resolvedDependencies.buildMergedGroups(
      source._userGroups,
      source._hiddenPluginGroupIds,
      _getBuiltInDefaultGroups(),
      _getPluginDefaultGroups(),
    );
  };

  const _resolveWebviewAssetPath = (assetPath: string, pluginId?: string): string =>
    resolvedDependencies.resolvePluginAssetPath(
      assetPath,
      source._extensionUri,
      source._pluginExtensionUris,
      source._view,
      source._panels,
      pluginId,
    );

  const _getLocalResourceRoots = (): vscode.Uri[] =>
    resolvedDependencies.getWebviewResourceRoots(
      source._extensionUri,
      source._pluginExtensionUris,
      resolvedDependencies.getWorkspaceFolders(),
    );

  const _refreshWebviewResourceRoots = (): void => {
    resolvedDependencies.refreshWebviewResourceRoots(
      source._view,
      source._panels,
      _getLocalResourceRoots(),
    );
  };

  const _normalizeExternalExtensionUri = (
    uri: vscode.Uri | string | undefined,
  ): vscode.Uri | undefined => resolvedDependencies.normalizeExtensionUri(uri);

  return {
    _registerBuiltInPluginRoots,
    _getPluginDefaultGroups,
    _getBuiltInDefaultGroups,
    _computeMergedGroups,
    _resolveWebviewAssetPath,
    _getLocalResourceRoots,
    _refreshWebviewResourceRoots,
    _normalizeExternalExtensionUri,
  };
}
