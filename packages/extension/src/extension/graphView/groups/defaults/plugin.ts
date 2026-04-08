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

export function getGraphViewPluginDefaultGroups(
  analyzer: GraphViewAnalyzerLike | undefined,
  disabledPlugins: ReadonlySet<string>,
  pluginExtensionUris: Map<string, vscode.Uri>,
  extensionUri: vscode.Uri,
): IGroup[] {
  if (!analyzer) return [];

  const result: IGroup[] = [];
  const addedIds = new Set<string>();

  for (const pluginInfo of analyzer.registry.list()) {
    if (disabledPlugins.has(pluginInfo.plugin.id)) continue;

    const fileColors = pluginInfo.plugin.fileColors;
    if (!fileColors) continue;

    const pluginId = pluginInfo.plugin.id;
    if (pluginInfo.builtIn && !pluginExtensionUris.has(pluginId)) {
      const dirName = getBuiltInGraphViewPluginDir(pluginId);
      if (dirName) {
        pluginExtensionUris.set(
          pluginId,
          vscode.Uri.joinPath(extensionUri, 'packages', dirName),
        );
      }
    }

    for (const [pattern, value] of Object.entries(fileColors)) {
      const color = typeof value === 'string' ? value : value.color;
      const id = `plugin:${pluginId}:${pattern}`;
      if (addedIds.has(id)) continue;

      const group: IGroup = {
        id,
        pattern,
        color,
        isPluginDefault: true,
        pluginName: pluginInfo.plugin.name,
      };
      if (typeof value === 'object') {
        if (value.shape2D) group.shape2D = value.shape2D;
        if (value.shape3D) group.shape3D = value.shape3D;
        if (value.imagePath) group.imagePath = value.imagePath;
      }

      result.push(group);
      addedIds.add(id);
    }
  }

  return result;
}
