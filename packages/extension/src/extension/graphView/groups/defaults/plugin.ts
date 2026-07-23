import * as vscode from 'vscode';
import type {
  IExtensionPluginDescriptorData,
  IPluginFileColorDefinition,
} from '@codegraphy-dev/extension-plugin-api';
import type { IGroup } from '../../../../shared/settings/groups';
import { getBuiltInGraphViewPluginDir } from './pluginRoots';

interface GraphViewPluginInfoLike {
  builtIn?: boolean;
  sourcePackageRoot?: string;
  data?: IExtensionPluginDescriptorData;
  plugin: {
    id: string;
    name: string;
  };
}

interface GraphViewPluginRegistryLike {
  extensionPlugins: {
    list(): GraphViewPluginInfoLike[];
  };
}

interface GraphViewAnalyzerLike {
  registry: GraphViewPluginRegistryLike;
}

const GRAPH_NODE_SHAPES = new Set([
  'circle',
  'square',
  'rectangle',
  'diamond',
  'triangle',
  'hexagon',
  'star',
]);

function readPluginFileColorDefinition(
  value: unknown,
): string | IPluginFileColorDefinition | undefined {
  if (typeof value === 'string' && value.length > 0) return value;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.color !== 'string' || candidate.color.length === 0) return undefined;
  if (
    candidate.shape2D !== undefined
    && (typeof candidate.shape2D !== 'string' || !GRAPH_NODE_SHAPES.has(candidate.shape2D))
  ) return undefined;
  if (candidate.imagePath !== undefined && typeof candidate.imagePath !== 'string') {
    return undefined;
  }

  return {
    color: candidate.color,
    ...(candidate.shape2D
      ? { shape2D: candidate.shape2D as IPluginFileColorDefinition['shape2D'] }
      : {}),
    ...(candidate.imagePath ? { imagePath: candidate.imagePath } : {}),
  };
}

function readPluginFileColors(
  pluginInfo: GraphViewPluginInfoLike,
): Record<string, string | IPluginFileColorDefinition> | undefined {
  const descriptorData = pluginInfo.data as unknown;
  if (!descriptorData || typeof descriptorData !== 'object' || Array.isArray(descriptorData)) {
    return undefined;
  }
  const fileColors = (descriptorData as { fileColors?: unknown }).fileColors;
  if (!fileColors || typeof fileColors !== 'object' || Array.isArray(fileColors)) return undefined;

  const result: Record<string, string | IPluginFileColorDefinition> = {};
  for (const [pattern, value] of Object.entries(fileColors)) {
    if (pattern.length === 0) continue;
    const definition = readPluginFileColorDefinition(value);
    if (definition) result[pattern] = definition;
  }
  return Object.keys(result).length > 0 ? result : undefined;
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
  if (!analyzer?.registry?.extensionPlugins?.list) return [];

  const result: IGroup[] = [];
  const addedIds = new Set<string>();

  for (const pluginInfo of analyzer.registry.extensionPlugins.list()) {
    if (disabledPlugins.has(pluginInfo.plugin.id)) continue;

    const fileColors = readPluginFileColors(pluginInfo);
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
