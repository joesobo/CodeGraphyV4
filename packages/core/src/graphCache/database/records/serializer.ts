import * as path from 'node:path';
import type {
  GraphMetadata,
  IAnalysisNode,
  IAnalysisRelation,
  IAnalysisSymbol,
  IGraphData,
  IGraphNode,
} from '@codegraphy-dev/plugin-api';
import type { IWorkspaceAnalysisCache } from '../../../analysis/cache';
import { getExternalPackageNodeId } from '../../../graph/packageSpecifiers/nodeId';
import type { SQLiteValue } from '../io/connection';
import {
  type EdgeRecord,
  type FileRecord,
  type NodeRecord,
  type NodeViewRecord,
  type SymbolRecord,
} from './types';

export type DatabaseRecord = Record<string, SQLiteValue>;

export interface NormalizedDatabaseRecords {
  files: FileRecord[];
  nodes: NodeRecord[];
  nodeViews: NodeViewRecord[];
  symbols: SymbolRecord[];
  edges: EdgeRecord[];
}

interface IdentityNormalizationContext {
  analysisToCachePath: ReadonlyMap<string, string>;
  workspacePrefix: string | null;
}

type NullableNodeFields = Omit<NodeRecord, 'key' | 'type' | 'label' | 'fileId' | 'parentId'>;

function emptyNullableNodeFields(): NullableNodeFields {
  return {
    pluginId: null,
    language: null,
  };
}

function sqliteBoolean(value: boolean): number {
  return Number(value);
}

function metadataString(metadata: GraphMetadata | undefined, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : null;
}

function normalizeSlashes(value: string): string {
  return value.replace(/\\/g, '/');
}

function createIdentityNormalizationContext(
  sortedFiles: ReadonlyArray<readonly [string, IWorkspaceAnalysisCache['files'][string]]>,
): IdentityNormalizationContext {
  const analysisToCachePath = new Map<string, string>();
  const prefixes = new Set<string>();
  for (const [filePath, entry] of sortedFiles) {
    const analysisPath = normalizeSlashes(entry.analysis.filePath);
    const cachePath = normalizeSlashes(filePath);
    analysisToCachePath.set(analysisPath, cachePath);
    if (analysisPath.endsWith(cachePath)) {
      prefixes.add(analysisPath.slice(0, -cachePath.length));
    }
  }
  return {
    analysisToCachePath,
    workspacePrefix: prefixes.size === 1 ? [...prefixes][0] ?? null : null,
  };
}

function normalizeKnownPath(
  value: string | null | undefined,
  context: IdentityNormalizationContext,
): string | null {
  if (!value) return null;
  const normalized = normalizeSlashes(value);
  const exact = context.analysisToCachePath.get(normalized);
  if (exact) return exact;
  if (context.workspacePrefix && normalized.startsWith(context.workspacePrefix)) {
    return normalized.slice(context.workspacePrefix.length);
  }
  return normalized;
}

function normalizeAnalysisId(
  value: string | undefined,
  context: IdentityNormalizationContext,
): string | null {
  return normalizeKnownPath(value, context);
}

function normalizeAnalysisIdForFile(
  value: string | undefined,
  analysisFilePath: string,
  context: IdentityNormalizationContext,
): string | null {
  if (!value) return null;
  const normalizedValue = normalizeSlashes(value);
  const normalizedAnalysisPath = normalizeSlashes(analysisFilePath);
  const cachePath = context.analysisToCachePath.get(normalizedAnalysisPath);
  if (cachePath) {
    if (normalizedValue === normalizedAnalysisPath) return cachePath;
    if (normalizedValue.startsWith(`${normalizedAnalysisPath}:`)
      || normalizedValue.startsWith(`${normalizedAnalysisPath}#`)) {
      return `${cachePath}${normalizedValue.slice(normalizedAnalysisPath.length)}`;
    }
  }
  return normalizeAnalysisId(normalizedValue, context);
}

function graphNodeFilePath(
  node: IGraphNode,
  knownFilePaths: ReadonlySet<string>,
  context: IdentityNormalizationContext,
): string | null {
  const candidate = node.symbol?.filePath
    ?? (typeof node.metadata?.filePath === 'string' ? node.metadata.filePath : undefined)
    ?? ((node.nodeType ?? 'file') === 'file' ? node.id : undefined);
  if (candidate && knownFilePaths.has(candidate)) return candidate;
  const normalized = normalizeKnownPath(candidate, context);
  return normalized && knownFilePaths.has(normalized) ? normalized : null;
}

function graphNodeRecord(
  node: IGraphNode,
  knownFilePaths: ReadonlySet<string>,
  context: IdentityNormalizationContext,
): NodeRecord {
  return {
    ...emptyNullableNodeFields(),
    key: normalizeAnalysisId(node.id, context) ?? node.id,
    type: node.nodeType ?? 'file',
    label: node.label,
    fileId: graphNodeFilePath(node, knownFilePaths, context),
    parentId: normalizeAnalysisId(
      typeof node.metadata?.parentId === 'string' ? node.metadata.parentId : undefined,
      context,
    ),
    pluginId: metadataString(node.metadata, 'pluginId'),
    language: node.symbol?.language ?? metadataString(node.metadata, 'language'),
  };
}

function graphNodeViewRecord(node: IGraphNode, nodeKey: string): NodeViewRecord {
  return {
    nodeKey,
    color: node.color,
    x: node.x ?? null,
    y: node.y ?? null,
    favorite: node.favorite === undefined ? null : sqliteBoolean(node.favorite),
    shape: node.shape2D ?? null,
    imageUrl: node.imageUrl ?? null,
    isCollapsed: node.isCollapsed === undefined ? null : sqliteBoolean(node.isCollapsed),
  };
}

function analysisNodeRecord(
  node: IAnalysisNode,
  ownerFilePath: string,
  ownerAnalysisPath: string,
  context: IdentityNormalizationContext,
): NodeRecord {
  const analysisFilePath = node.filePath ?? ownerAnalysisPath;
  return {
    ...emptyNullableNodeFields(),
    key: normalizeAnalysisIdForFile(node.id, analysisFilePath, context) ?? node.id,
    type: node.nodeType,
    label: node.label,
    fileId: ownerFilePath,
    parentId: normalizeAnalysisIdForFile(node.parentId, analysisFilePath, context),
    pluginId: metadataString(node.metadata, 'pluginId'),
    language: metadataString(node.metadata, 'language'),
  };
}

function mergeAnalysisNode(existing: NodeRecord | undefined, analysis: NodeRecord): NodeRecord {
  if (!existing) return analysis;
  return {
    ...existing,
    fileId: existing.fileId ?? analysis.fileId,
    parentId: existing.parentId ?? analysis.parentId,
    pluginId: existing.pluginId ?? analysis.pluginId,
    language: existing.language ?? analysis.language,
  };
}

function symbolRecord(
  nodeId: string,
  symbol: Pick<IAnalysisSymbol, 'kind' | 'metadata' | 'name'>,
  language?: string,
): SymbolRecord {
  return {
    nodeId,
    name: symbol.name,
    kind: symbol.kind,
    pluginId: metadataString(symbol.metadata, 'pluginId'),
    language: language ?? metadataString(symbol.metadata, 'language'),
  };
}

function relationEndpoints(
  relation: IAnalysisRelation,
  context: IdentityNormalizationContext,
  analysisToGraphId: ReadonlyMap<string, string>,
): { from: string; to: string; toType: 'file' | 'package' | 'symbol' } | undefined {
  const normalizedFromId = normalizeAnalysisIdForFile(
    relation.fromSymbolId ?? relation.fromNodeId,
    relation.fromFilePath,
    context,
  );
  const from = (normalizedFromId ? analysisToGraphId.get(normalizedFromId) : undefined)
    ?? normalizedFromId
    ?? normalizeKnownPath(relation.fromFilePath, context);
  const targetFilePath = relation.resolvedPath ?? relation.toFilePath;
  const externalPackageId = targetFilePath
    ? null
    : getExternalPackageNodeId(relation.specifier ?? '');
  const normalizedToId = targetFilePath
    ? normalizeAnalysisIdForFile(
        relation.toSymbolId ?? relation.toNodeId,
        targetFilePath,
        context,
      )
    : normalizeAnalysisId(relation.toSymbolId ?? relation.toNodeId, context);
  const to = (normalizedToId ? analysisToGraphId.get(normalizedToId) : undefined)
    ?? normalizedToId
    ?? normalizeKnownPath(targetFilePath, context)
    ?? externalPackageId;
  if (!from || !to) return undefined;
  return {
    from,
    to,
    toType: externalPackageId === to
      ? 'package'
      : relation.toSymbolId || relation.toNodeId ? 'symbol' : 'file',
  };
}

function addEndpointNode(
  nodes: Map<string, NodeRecord>,
  id: string,
  knownFilePaths: ReadonlySet<string>,
  type: 'file' | 'package' | 'symbol' = knownFilePaths.has(id) ? 'file' : 'symbol',
): void {
  if (nodes.has(id)) return;
  nodes.set(id, {
    ...emptyNullableNodeFields(),
    key: id,
    type,
    label: path.basename(id),
    fileId: knownFilePaths.has(id) ? id : null,
    parentId: null,
  });
}

function edgeIdentity(from: string, to: string, type: string): string {
  return `${from}\u0000${to}\u0000${type}`;
}

function graphSymbolIdentity(
  filePath: string,
  name: string,
  kind: string,
  signature: string | undefined,
): string {
  return `${filePath}\u0000${name}\u0000${kind}\u0000${signature ?? ''}`;
}

function createAnalysisToGraphId(
  sortedFiles: ReadonlyArray<readonly [string, IWorkspaceAnalysisCache['files'][string]]>,
  graphData: IGraphData,
  context: IdentityNormalizationContext,
): Map<string, string> {
  const graphIdsBySymbol = new Map<string, string[]>();
  for (const node of graphData.nodes) {
    if (!node.symbol) continue;
    const filePath = normalizeKnownPath(node.symbol.filePath, context);
    if (!filePath) continue;
    const identity = graphSymbolIdentity(
      filePath,
      node.symbol.name,
      node.symbol.kind,
      node.symbol.signature,
    );
    const graphIds = graphIdsBySymbol.get(identity) ?? [];
    graphIds.push(normalizeAnalysisId(node.id, context) ?? node.id);
    graphIdsBySymbol.set(identity, graphIds);
  }

  const graphIndexBySymbol = new Map<string, number>();
  const analysisToGraphId = new Map<string, string>();
  // Identical symbol identities are paired by their deterministic file and symbol iteration order.
  // A producer that cannot preserve this order must provide another stable identity discriminator.
  for (const [filePath, entry] of sortedFiles) {
    for (const symbol of entry.analysis.symbols ?? []) {
      const identity = graphSymbolIdentity(filePath, symbol.name, symbol.kind, symbol.signature);
      const index = graphIndexBySymbol.get(identity) ?? 0;
      const graphId = graphIdsBySymbol.get(identity)?.[index];
      graphIndexBySymbol.set(identity, index + 1);
      const analysisId = normalizeAnalysisIdForFile(symbol.id, symbol.filePath, context);
      if (analysisId && graphId) analysisToGraphId.set(analysisId, graphId);
    }
  }
  return analysisToGraphId;
}

export function serializeDatabaseRecords(
  cache: IWorkspaceAnalysisCache,
  graph?: IGraphData,
): NormalizedDatabaseRecords {
  const graphData = graph ?? { nodes: [], edges: [] };
  const sortedFiles = Object.entries(cache.files).sort(([left], [right]) => left.localeCompare(right));
  const knownFilePaths = new Set(sortedFiles.map(([filePath]) => filePath));
  const normalization = createIdentityNormalizationContext(sortedFiles);
  const analysisToGraphId = createAnalysisToGraphId(sortedFiles, graphData, normalization);
  const files: FileRecord[] = sortedFiles.map(([filePath, entry]) => ({
    path: filePath,
    size: entry.size ?? -1,
    contentHash: entry.contentHash ?? null,
  }));

  const nodes = new Map<string, NodeRecord>();
  const nodeViews = new Map<string, NodeViewRecord>();
  for (const node of graphData.nodes) {
    const record = graphNodeRecord(node, knownFilePaths, normalization);
    nodes.set(record.key, record);
    nodeViews.set(record.key, graphNodeViewRecord(node, record.key));
  }
  for (const [filePath] of sortedFiles) addEndpointNode(nodes, filePath, knownFilePaths);
  for (const [filePath, entry] of sortedFiles) {
    for (const node of entry.analysis.nodes ?? []) {
      const record = analysisNodeRecord(node, filePath, entry.analysis.filePath, normalization);
      nodes.set(record.key, mergeAnalysisNode(nodes.get(record.key), record));
    }
    for (const symbol of entry.analysis.symbols ?? []) {
      const analysisId = normalizeAnalysisIdForFile(symbol.id, symbol.filePath, normalization) ?? symbol.id;
      const key = analysisToGraphId.get(analysisId) ?? analysisId;
      addEndpointNode(nodes, key, knownFilePaths, 'symbol');
      const node = nodes.get(key);
      if (node) {
        node.fileId ??= filePath;
        if (node.type === 'symbol') node.label = symbol.name;
      }
    }
  }

  const symbols = new Map<string, SymbolRecord>();
  for (const node of graphData.nodes) {
    if (node.symbol) {
      const nodeId = normalizeAnalysisId(node.id, normalization) ?? node.id;
      symbols.set(nodeId, {
        nodeId,
        name: node.symbol.name,
        kind: node.symbol.kind,
        pluginId: metadataString(node.metadata, 'pluginId'),
        language: node.symbol.language ?? metadataString(node.metadata, 'language'),
      });
    }
  }
  for (const [, entry] of sortedFiles) {
    for (const symbol of entry.analysis.symbols ?? []) {
      const analysisId = normalizeAnalysisIdForFile(symbol.id, symbol.filePath, normalization) ?? symbol.id;
      const key = analysisToGraphId.get(analysisId) ?? analysisId;
      symbols.set(key, symbolRecord(key, symbol));
    }
  }

  const edges = new Map<string, EdgeRecord>();
  for (const edge of graphData.edges) {
    const from = normalizeAnalysisId(edge.from, normalization) ?? edge.from;
    const to = normalizeAnalysisId(edge.to, normalization) ?? edge.to;
    addEndpointNode(nodes, from, knownFilePaths);
    addEndpointNode(nodes, to, knownFilePaths);
    edges.set(edge.id, {
      key: edge.id,
      sourceNodeId: from,
      targetNodeId: to,
      type: edge.kind,
    });
  }
  if (!graph) {
    const fallbackCounts = new Map<string, number>();
    for (const [, entry] of sortedFiles) {
      for (const relation of entry.analysis.relations ?? []) {
        const endpoints = relationEndpoints(relation, normalization, analysisToGraphId);
        if (!endpoints) continue;
        addEndpointNode(nodes, endpoints.from, knownFilePaths);
        addEndpointNode(nodes, endpoints.to, knownFilePaths, endpoints.toType);
        const identity = edgeIdentity(endpoints.from, endpoints.to, relation.kind);
        const occurrence = (fallbackCounts.get(identity) ?? 0) + 1;
        fallbackCounts.set(identity, occurrence);
        const baseKey = `${endpoints.from}->${endpoints.to}#${relation.kind}`;
        const key = occurrence === 1 ? baseKey : `${baseKey}:${occurrence}`;
        edges.set(key, {
          key,
          sourceNodeId: endpoints.from,
          targetNodeId: endpoints.to,
          type: relation.kind,
        });
      }
    }
  }

  for (const record of nodes.values()) {
    if (record.parentId !== null && !nodes.has(String(record.parentId))) record.parentId = null;
  }

  return {
    files,
    nodes: [...nodes.values()].sort((left, right) => left.key.localeCompare(right.key)),
    nodeViews: [...nodeViews.values()].sort((left, right) => left.nodeKey.localeCompare(right.nodeKey)),
    symbols: [...symbols.values()].sort((left, right) => left.nodeId.localeCompare(right.nodeId)),
    edges: [...edges.values()].sort((left, right) => left.key.localeCompare(right.key)),
  };
}
