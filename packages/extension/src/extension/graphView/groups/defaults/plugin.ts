import * as vscode from 'vscode';
import type { IGroup } from '../../../../shared/settings/groups';
import type { IPluginFileColorDefinition } from '../../../../core/plugins/types/contracts';
import { getBuiltInGraphViewPluginDir } from './pluginRoots';

interface GraphViewPluginInfoLike {
  builtIn?: boolean;
  plugin: {
    id: string;
    name: string;
    fileColors?: Record<string, string | IPluginFileColorDefinition>;
  };
}

interface GraphViewPluginRegistryLike {
  list(): GraphViewPluginInfoLike[];
}

interface GraphViewAnalyzerLike {
  registry: GraphViewPluginRegistryLike;
}

function ensurePluginExtensionUri(
  pluginInfo: GraphViewPluginInfoLike,
  pluginExtensionUris: Map<string, vscode.Uri>,
  extensionUri: vscode.Uri,
): void {
  const pluginId = pluginInfo.plugin.id;
  if (!pluginInfo.builtIn || pluginExtensionUris.has(pluginId)) {
    return;
  }

  const dirName = getBuiltInGraphViewPluginDir(pluginId);
  if (dirName) {
    pluginExtensionUris.set(
      pluginId,
      vscode.Uri.joinPath(extensionUri, 'packages', dirName),
    );
  }
}

function createPluginDefaultGroup(
  pluginInfo: GraphViewPluginInfoLike,
  pattern: string,
  value: string | IPluginFileColorDefinition,
): IGroup {
  const group: IGroup = {
    id: `plugin:${pluginInfo.plugin.id}:${pattern}`,
    pattern,
    color: typeof value === 'string' ? value : value.color,
    isPluginDefault: true,
    pluginId: pluginInfo.plugin.id,
    pluginName: pluginInfo.plugin.name,
  };

  if (typeof value === 'object') {
    if (value.shape2D) group.shape2D = value.shape2D;
    if (value.shape3D) group.shape3D = value.shape3D;
    if (value.imagePath) group.imagePath = value.imagePath;
  }

  return group;
}

export function getGraphViewPluginDefaultGroups(
  analyzer: GraphViewAnalyzerLike | undefined,
  disabledPlugins: ReadonlySet<string>,
  pluginExtensionUris: Map<string, vscode.Uri>,
  extensionUri: vscode.Uri,
): IGroup[] {
  if (!analyzer?.registry?.list) return [];

  const result: IGroup[] = [];
  const addedIds = new Set<string>();

  for (const pluginInfo of analyzer.registry.list()) {
    if (disabledPlugins.has(pluginInfo.plugin.id)) continue;

    const fileColors = pluginInfo.plugin.fileColors;
    if (!fileColors) continue;

    ensurePluginExtensionUri(pluginInfo, pluginExtensionUris, extensionUri);

    for (const [pattern, value] of Object.entries(fileColors)) {
      const id = `plugin:${pluginInfo.plugin.id}:${pattern}`;
      if (addedIds.has(id)) continue;

      result.push(createPluginDefaultGroup(pluginInfo, pattern, value));
      addedIds.add(id);
    }
  }

  return result;
}
