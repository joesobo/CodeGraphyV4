import * as vscode from 'vscode';
import type {
  IExtensionPluginDescriptorData,
  IExtensionPluginLegendEntry,
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

function readStringArray(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    return undefined;
  }
  return value;
}

function readPluginLegendEntry(value: unknown): IExtensionPluginLegendEntry | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.id !== 'string'
    || candidate.id.length === 0
    || typeof candidate.label !== 'string'
    || candidate.label.length === 0
    || typeof candidate.pattern !== 'string'
    || candidate.pattern.length === 0
    || typeof candidate.color !== 'string'
    || candidate.color.length === 0
  ) return undefined;
  if (
    candidate.target !== undefined
    && candidate.target !== 'node'
    && candidate.target !== 'edge'
    && candidate.target !== 'both'
  ) return undefined;
  if (
    candidate.shape2D !== undefined
    && (typeof candidate.shape2D !== 'string' || !GRAPH_NODE_SHAPES.has(candidate.shape2D))
  ) return undefined;
  if (candidate.imagePath !== undefined && typeof candidate.imagePath !== 'string') {
    return undefined;
  }

  const matchCandidate = candidate.match;
  if (
    matchCandidate !== undefined
    && (!matchCandidate || typeof matchCandidate !== 'object' || Array.isArray(matchCandidate))
  ) return undefined;

  const match = matchCandidate as Record<string, unknown> | undefined;
  if (
    match?.nodeType !== undefined
    && !['file', 'folder', 'package', 'symbol', 'variable'].includes(String(match.nodeType))
  ) return undefined;
  if (
    match?.symbolKinds !== undefined
    && readStringArray(match.symbolKinds) === undefined
  ) return undefined;
  for (const key of [
    'symbolPluginKind',
    'symbolSource',
    'symbolLanguage',
    'symbolFilePath',
  ]) {
    if (match?.[key] !== undefined && typeof match[key] !== 'string') return undefined;
  }

  return {
    id: candidate.id,
    label: candidate.label,
    pattern: candidate.pattern,
    color: candidate.color,
    ...(candidate.target ? { target: candidate.target as IExtensionPluginLegendEntry['target'] } : {}),
    ...(match
      ? {
        match: {
          ...(match.nodeType ? { nodeType: match.nodeType as NonNullable<IExtensionPluginLegendEntry['match']>['nodeType'] } : {}),
          ...(match.symbolKinds ? { symbolKinds: readStringArray(match.symbolKinds) } : {}),
          ...(match.symbolPluginKind ? { symbolPluginKind: match.symbolPluginKind as string } : {}),
          ...(match.symbolSource ? { symbolSource: match.symbolSource as string } : {}),
          ...(match.symbolLanguage ? { symbolLanguage: match.symbolLanguage as string } : {}),
          ...(match.symbolFilePath ? { symbolFilePath: match.symbolFilePath as string } : {}),
        },
      }
      : {}),
    ...(candidate.shape2D
      ? { shape2D: candidate.shape2D as IExtensionPluginLegendEntry['shape2D'] }
      : {}),
    ...(candidate.imagePath ? { imagePath: candidate.imagePath } : {}),
  };
}

function readPluginLegendEntries(
  pluginInfo: GraphViewPluginInfoLike,
): readonly IExtensionPluginLegendEntry[] {
  const descriptorData = pluginInfo.data as unknown;
  if (!descriptorData || typeof descriptorData !== 'object' || Array.isArray(descriptorData)) {
    return [];
  }
  const legendEntries = (descriptorData as { legendEntries?: unknown }).legendEntries;
  if (!Array.isArray(legendEntries)) return [];

  const result: IExtensionPluginLegendEntry[] = [];
  for (const value of legendEntries) {
    const entry = readPluginLegendEntry(value);
    if (entry) result.push(entry);
  }
  return result;
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
  entry: IExtensionPluginLegendEntry,
): IGroup {
  const group: IGroup = {
    id: entry.id,
    pattern: entry.pattern,
    displayLabel: entry.label,
    color: entry.color,
    isPluginDefault: true,
    pluginId: pluginInfo.plugin.id,
    pluginName: pluginInfo.plugin.name,
  };

  if (entry.target) group.target = entry.target;
  if (entry.match?.nodeType) {
    group.matchNodeType = entry.match.nodeType as IGroup['matchNodeType'];
  }
  if (entry.match?.symbolKinds) group.matchSymbolKinds = [...entry.match.symbolKinds];
  if (entry.match?.symbolPluginKind) {
    group.matchSymbolPluginKind = entry.match.symbolPluginKind;
  }
  if (entry.match?.symbolSource) group.matchSymbolSource = entry.match.symbolSource;
  if (entry.match?.symbolLanguage) group.matchSymbolLanguage = entry.match.symbolLanguage;
  if (entry.match?.symbolFilePath) group.matchSymbolFilePath = entry.match.symbolFilePath;
  if (entry.shape2D) group.shape2D = entry.shape2D;
  if (entry.imagePath) group.imagePath = entry.imagePath;

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

    const legendEntries = readPluginLegendEntries(pluginInfo);
    if (legendEntries.length === 0) continue;

    ensurePluginExtensionUri(pluginInfo, pluginExtensionUris, extensionUri);

    for (const entry of legendEntries) {
      if (addedIds.has(entry.id)) continue;

      result.push(createPluginDefaultGroup(pluginInfo, entry));
      addedIds.add(entry.id);
    }
  }

  return result;
}
