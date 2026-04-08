/**
 * @fileoverview Pure file-routing functions for the plugin registry.
 * Determines which plugin handles a given file based on extension maps.
 * @module core/plugins/routing/router
 */

import { IPlugin, IConnection, IFileAnalysisResult } from '../types/contracts';
import { getFileExtension, normalizePluginExtension } from './fileExtensions';

/** Minimal plugin info subset needed for routing lookups. */
export interface IRoutablePluginInfo {
  plugin: IPlugin;
}

export type CoreFileAnalysisResultProvider = (
  filePath: string,
  content: string,
  workspaceRoot: string,
) => Promise<IFileAnalysisResult | null>;

/**
 * Gets the plugin that should handle a given file.
 * Returns the first registered plugin that supports the file's extension.
 */
export function getPluginForFile(
  filePath: string,
  plugins: Map<string, IRoutablePluginInfo>,
  extensionMap: Map<string, string[]>,
): IPlugin | undefined {
  const ext = getFileExtension(filePath);
  const pluginIds = extensionMap.get(ext);

  if (!pluginIds || pluginIds.length === 0) {
    return undefined;
  }

  for (const pluginId of pluginIds) {
    const plugin = plugins.get(pluginId)?.plugin;
    if (plugin) {
      return plugin;
    }
  }

  return undefined;
}

/**
 * Gets all plugins that support a given file extension.
 */
export function getPluginsForExtension(
  extension: string,
  plugins: Map<string, IRoutablePluginInfo>,
  extensionMap: Map<string, string[]>,
): IPlugin[] {
  const normalizedExt = normalizePluginExtension(extension);
  const pluginIds = extensionMap.get(normalizedExt);
  if (!pluginIds) {
    return [];
  }

  const result: IPlugin[] = [];
  for (const pluginId of pluginIds) {
    const plugin = plugins.get(pluginId)?.plugin;
    if (plugin) {
      result.push(plugin);
    }
  }
  return result;
}

/**
 * Checks if any plugin supports a given file.
 */
export function supportsFile(
  filePath: string,
  extensionMap: Map<string, string[]>,
): boolean {
  const ext = getFileExtension(filePath);
  return extensionMap.has(ext);
}

/**
 * Gets all supported file extensions across all plugins.
 */
export function getSupportedExtensions(
  extensionMap: Map<string, string[]>,
): string[] {
  return Array.from(extensionMap.keys());
}

function getPluginsForFile(
  filePath: string,
  plugins: Map<string, IRoutablePluginInfo>,
  extensionMap: Map<string, string[]>,
): IPlugin[] {
  const ext = getFileExtension(filePath);
  return getPluginsForExtension(ext, plugins, extensionMap);
}

function createEmptyFileAnalysisResult(filePath: string): IFileAnalysisResult {
  return {
    filePath,
    edgeTypes: [],
    nodeTypes: [],
    nodes: [],
    relations: [],
    symbols: [],
  };
}

function getRelationKey(relation: NonNullable<IFileAnalysisResult['relations']>[number]): string {
  return [
    relation.kind,
    relation.sourceId,
    relation.fromFilePath,
    relation.fromNodeId ?? '',
    relation.fromSymbolId ?? '',
    relation.specifier ?? '',
    relation.type ?? '',
    relation.variant ?? '',
  ].join('|');
}

function mergeById<TItem extends { id: string }>(
  baseItems: TItem[] | undefined,
  nextItems: TItem[] | undefined,
): TItem[] {
  const merged = new Map<string, TItem>();

  for (const item of baseItems ?? []) {
    merged.set(item.id, item);
  }

  for (const item of nextItems ?? []) {
    merged.set(item.id, item);
  }

  return [...merged.values()];
}

function mergeRelations(
  baseRelations: NonNullable<IFileAnalysisResult['relations']> | undefined,
  nextRelations: NonNullable<IFileAnalysisResult['relations']> | undefined,
): NonNullable<IFileAnalysisResult['relations']> {
  const merged = new Map<string, NonNullable<IFileAnalysisResult['relations']>[number]>();

  for (const relation of baseRelations ?? []) {
    merged.set(getRelationKey(relation), relation);
  }

  for (const relation of nextRelations ?? []) {
    merged.set(getRelationKey(relation), relation);
  }

  return [...merged.values()];
}

function mergeFileAnalysisResults(
  baseResult: IFileAnalysisResult,
  nextResult: IFileAnalysisResult,
): IFileAnalysisResult {
  return {
    filePath: nextResult.filePath || baseResult.filePath,
    edgeTypes: mergeById(baseResult.edgeTypes, nextResult.edgeTypes),
    nodeTypes: mergeById(baseResult.nodeTypes, nextResult.nodeTypes),
    nodes: mergeById(baseResult.nodes, nextResult.nodes),
    relations: mergeRelations(baseResult.relations, nextResult.relations),
    symbols: mergeById(baseResult.symbols, nextResult.symbols),
  };
}

function toConnectionsFromFileAnalysis(analysis: IFileAnalysisResult): IConnection[] {
  return (analysis.relations ?? []).map(relation => ({
    kind: relation.kind,
    sourceId: relation.sourceId,
    specifier: relation.specifier ?? '',
    resolvedPath: relation.resolvedPath ?? relation.toFilePath ?? null,
    type: relation.type,
    variant: relation.variant,
    metadata: relation.metadata,
  }));
}

/**
 * Analyzes a file using the appropriate plugin.
 */
export async function analyzeFile(
  filePath: string,
  content: string,
  workspaceRoot: string,
  plugins: Map<string, IRoutablePluginInfo>,
  extensionMap: Map<string, string[]>,
  coreAnalyzeFileResult?: CoreFileAnalysisResultProvider,
): Promise<IConnection[]> {
  const analysis = await analyzeFileResult(
    filePath,
    content,
    workspaceRoot,
    plugins,
    extensionMap,
    coreAnalyzeFileResult,
  );
  return analysis ? toConnectionsFromFileAnalysis(analysis) : [];
}

function toLegacyFileAnalysisResult(
  filePath: string,
  connections: IConnection[],
): IFileAnalysisResult {
  return {
    filePath,
    relations: connections.map(connection => ({
      kind: connection.kind,
      sourceId: connection.sourceId,
      specifier: connection.specifier,
      type: connection.type,
      variant: connection.variant,
      resolvedPath: connection.resolvedPath,
      metadata: connection.metadata,
      fromFilePath: filePath,
      toFilePath: connection.resolvedPath,
    })),
  };
}

export async function analyzeFileResult(
  filePath: string,
  content: string,
  workspaceRoot: string,
  plugins: Map<string, IRoutablePluginInfo>,
  extensionMap: Map<string, string[]>,
  coreAnalyzeFileResult?: CoreFileAnalysisResultProvider,
): Promise<IFileAnalysisResult | null> {
  const matchingPlugins = getPluginsForFile(filePath, plugins, extensionMap);
  const coreResult = await coreAnalyzeFileResult?.(filePath, content, workspaceRoot) ?? null;
  const normalizedCoreResult = coreResult
    ? mergeFileAnalysisResults(createEmptyFileAnalysisResult(filePath), coreResult)
    : null;

  if (matchingPlugins.length === 0) {
    return normalizedCoreResult;
  }

  let mergedResult = normalizedCoreResult ?? createEmptyFileAnalysisResult(filePath);

  for (let index = matchingPlugins.length - 1; index >= 0; index -= 1) {
    const plugin = matchingPlugins[index];

    try {
      const pluginResult = plugin.analyzeFile
        ? await plugin.analyzeFile(filePath, content, workspaceRoot)
        : toLegacyFileAnalysisResult(
            filePath,
            await plugin.detectConnections(filePath, content, workspaceRoot),
          );

      mergedResult = mergeFileAnalysisResults(mergedResult, pluginResult);
    } catch (error) {
      console.error(`[CodeGraphy] Error analyzing ${filePath} with ${plugin.id}:`, error);
    }
  }

  return mergedResult;
}
