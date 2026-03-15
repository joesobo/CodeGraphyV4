import * as vscode from 'vscode';
import type { IGroup } from '../../shared/types';
import { getBuiltInGraphViewDefaultGroups } from './builtInDefaultGroups';
import { registerBuiltInGraphViewPluginRoots } from './builtInPluginRoots';
import { buildGraphViewMergedGroups } from './mergedGroups';
import { getGraphViewPluginDefaultGroups } from './pluginDefaultGroups';
import {
  getGraphViewWebviewResourceRoots,
  refreshGraphViewResourceRoots,
  resolveGraphViewPluginAssetPath,
} from './pluginWebview';
import { normalizeGraphViewExtensionUri } from '../graphViewResources';

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

const DEFAULT_DEPENDENCIES: GraphViewProviderPluginResourceMethodDependencies = {
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

export function createGraphViewProviderPluginResourceMethods(
  source: GraphViewProviderPluginResourceMethodsSource,
  dependencies: GraphViewProviderPluginResourceMethodDependencies = DEFAULT_DEPENDENCIES,
): GraphViewProviderPluginResourceMethods {
  const _registerBuiltInPluginRoots = (): void => {
    dependencies.registerBuiltInPluginRoots(source._extensionUri, source._pluginExtensionUris);
  };

  const _getPluginDefaultGroups = (): IGroup[] =>
    dependencies.getPluginDefaultGroups(
      source._analyzer as never,
      source._disabledPlugins,
      source._pluginExtensionUris,
      source._extensionUri,
    );

  const _getBuiltInDefaultGroups = (): IGroup[] => dependencies.getBuiltInDefaultGroups();

  const _computeMergedGroups = (): void => {
    source._groups = dependencies.buildMergedGroups(
      source._userGroups,
      source._hiddenPluginGroupIds,
      _getBuiltInDefaultGroups(),
      _getPluginDefaultGroups(),
    );
  };

  const _resolveWebviewAssetPath = (assetPath: string, pluginId?: string): string =>
    dependencies.resolvePluginAssetPath(
      assetPath,
      source._extensionUri,
      source._pluginExtensionUris,
      source._view,
      source._panels,
      pluginId,
    );

  const _getLocalResourceRoots = (): vscode.Uri[] =>
    dependencies.getWebviewResourceRoots(
      source._extensionUri,
      source._pluginExtensionUris,
      dependencies.getWorkspaceFolders(),
    );

  const _refreshWebviewResourceRoots = (): void => {
    dependencies.refreshWebviewResourceRoots(
      source._view,
      source._panels,
      _getLocalResourceRoots(),
    );
  };

  const _normalizeExternalExtensionUri = (
    uri: vscode.Uri | string | undefined,
  ): vscode.Uri | undefined => dependencies.normalizeExtensionUri(uri);

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
