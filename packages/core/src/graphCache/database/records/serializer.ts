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
  NODE_COLUMNS,
  type EdgeRecord,
  type FileRecord,
  type NodeRecord,
  type SymbolRecord,
} from './types';

export type DatabaseRecord = Record<string, SQLiteValue>;

export interface NormalizedDatabaseRecords {
  files: FileRecord[];
  nodes: NodeRecord[];
  symbols: SymbolRecord[];
  edges: EdgeRecord[];
}

function emptyNodeRecord(): NodeRecord {
  return Object.fromEntries(NODE_COLUMNS.map(column => [column, null])) as unknown as NodeRecord;
}

function sqliteBoolean(value: boolean | undefined): number | null {
  return value === undefined ? null : Number(value);
}

function metadataString(metadata: GraphMetadata | undefined, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : null;
}

function normalizeKnownPath(
  value: string | null | undefined,
  analysisToCachePath: ReadonlyMap<string, string>,
): string | null {
  if (!value) return null;
  const exact = analysisToCachePath.get(value);
  if (exact) return exact;
  for (const [analysisPath, cachePath] of analysisToCachePath) {
    if (!analysisPath.endsWith(cachePath)) continue;
    const workspacePrefix = analysisPath.slice(0, -cachePath.length);
    if (workspacePrefix && value.startsWith(workspacePrefix)) {
      return value.slice(workspacePrefix.length);
    }
  }
  return value;
}

function normalizeAnalysisId(
  value: string | undefined,
  analysisToCachePath: ReadonlyMap<string, string>,
): string | null {
  if (!value) return null;
  const exactPath = analysisToCachePath.get(value);
  if (exactPath) return exactPath;
  for (const [analysisPath, cachePath] of analysisToCachePath) {
    if (value.startsWith(`${analysisPath}:`) || value.startsWith(`${analysisPath}#`)) {
      return `${cachePath}${value.slice(analysisPath.length)}`;
    }
  }
  return value;
}

function normalizeAnalysisIdForFile(
  value: string | undefined,
  analysisFilePath: string,
  analysisToCachePath: ReadonlyMap<string, string>,
): string | null {
  if (!value) return null;
  const cachePath = analysisToCachePath.get(analysisFilePath);
  if (!cachePath) return value;
  if (value === analysisFilePath) return cachePath;
  if (value.startsWith(`${analysisFilePath}:`) || value.startsWith(`${analysisFilePath}#`)) {
    return `${cachePath}${value.slice(analysisFilePath.length)}`;
  }
  return value;
}

function graphNodeFilePath(
  node: IGraphNode,
  knownFilePaths: ReadonlySet<string>,
  analysisToCachePath: ReadonlyMap<string, string>,
): string | null {
  const candidate = node.symbol?.filePath
    ?? (typeof node.metadata?.filePath === 'string' ? node.metadata.filePath : undefined)
    ?? ((node.nodeType ?? 'file') === 'file' ? node.id : undefined);
  if (candidate && knownFilePaths.has(candidate)) return candidate;
  const normalized = normalizeKnownPath(candidate, analysisToCachePath);
  return normalized && knownFilePaths.has(normalized) ? normalized : null;
}

function graphNodeRecord(
  node: IGraphNode,
  knownFilePaths: ReadonlySet<string>,
  analysisToCachePath: ReadonlyMap<string, string>,
): NodeRecord {
  return {
    ...emptyNodeRecord(),
    key: node.id,
    type: node.nodeType ?? 'file',
    label: node.label,
    fileId: graphNodeFilePath(node, knownFilePaths, analysisToCachePath),
    parentId: normalizeAnalysisId(
      typeof node.metadata?.parentId === 'string' ? node.metadata.parentId : undefined,
      analysisToCachePath,
    ),
    color: node.color,
    x: node.x ?? null,
    y: node.y ?? null,
    favorite: sqliteBoolean(node.favorite),
    shape: node.shape2D ?? null,
    imageUrl: node.imageUrl ?? null,
    isCollapsed: sqliteBoolean(node.isCollapsed),
    pluginId: metadataString(node.metadata, 'pluginId'),
    language: node.symbol?.language ?? metadataString(node.metadata, 'language'),
  };
}

function analysisNodeRecord(
  node: IAnalysisNode,
  ownerFilePath: string,
  ownerAnalysisPath: string,
  analysisToCachePath: ReadonlyMap<string, string>,
): NodeRecord {
  const analysisFilePath = node.filePath ?? ownerAnalysisPath;
  return {
    ...emptyNodeRecord(),
    key: normalizeAnalysisIdForFile(node.id, analysisFilePath, analysisToCachePath) ?? node.id,
    type: node.nodeType,
    label: node.label,
    fileId: ownerFilePath,
    parentId: normalizeAnalysisIdForFile(node.parentId, analysisFilePath, analysisToCachePath),
    color: '#808080',
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
  analysisToCachePath: ReadonlyMap<string, string>,
): { from: string; to: string; toType: 'file' | 'package' | 'symbol' } | undefined {
  const from = normalizeAnalysisIdForFile(
    relation.fromSymbolId ?? relation.fromNodeId,
    relation.fromFilePath,
    analysisToCachePath,
  ) ?? normalizeKnownPath(relation.fromFilePath, analysisToCachePath);
  const targetFilePath = relation.resolvedPath ?? relation.toFilePath;
  const externalPackageId = targetFilePath
    ? null
    : getExternalPackageNodeId(relation.specifier ?? '');
  const to = (targetFilePath
    ? normalizeAnalysisIdForFile(
        relation.toSymbolId ?? relation.toNodeId,
        targetFilePath,
        analysisToCachePath,
      )
    : normalizeAnalysisId(relation.toSymbolId ?? relation.toNodeId, analysisToCachePath))
    ?? normalizeKnownPath(targetFilePath, analysisToCachePath)
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
    ...emptyNodeRecord(),
    key: id,
    type,
    label: path.basename(id),
    fileId: knownFilePaths.has(id) ? id : null,
    parentId: null,
    color: '#808080',
  });
}

function edgeIdentity(from: string, to: string, type: string): string {
  return `${from}\u0000${to}\u0000${type}`;
}

export function serializeDatabaseRecords(
  cache: IWorkspaceAnalysisCache,
  graph?: IGraphData,
): NormalizedDatabaseRecords {
  const graphData = graph ?? { nodes: [], edges: [] };
  const sortedFiles = Object.entries(cache.files).sort(([left], [right]) => left.localeCompare(right));
  const knownFilePaths = new Set(sortedFiles.map(([filePath]) => filePath));
  const analysisToCachePath = new Map(sortedFiles.map(([filePath, entry]) => [entry.analysis.filePath, filePath]));
  const files: FileRecord[] = sortedFiles.map(([filePath, entry]) => ({
    path: filePath,
    size: entry.size ?? -1,
    contentHash: entry.contentHash ?? null,
  }));

  const nodes = new Map<string, NodeRecord>();
  for (const node of graphData.nodes) {
    nodes.set(node.id, graphNodeRecord(node, knownFilePaths, analysisToCachePath));
  }
  for (const [filePath] of sortedFiles) addEndpointNode(nodes, filePath, knownFilePaths);
  for (const [filePath, entry] of sortedFiles) {
    for (const node of entry.analysis.nodes ?? []) {
      const record = analysisNodeRecord(node, filePath, entry.analysis.filePath, analysisToCachePath);
      nodes.set(record.key, mergeAnalysisNode(nodes.get(record.key), record));
    }
    for (const symbol of entry.analysis.symbols ?? []) {
      const key = normalizeAnalysisIdForFile(symbol.id, symbol.filePath, analysisToCachePath) ?? symbol.id;
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
      symbols.set(node.id, {
        nodeId: node.id,
        name: node.symbol.name,
        kind: node.symbol.kind,
        pluginId: metadataString(node.metadata, 'pluginId'),
        language: node.symbol.language ?? metadataString(node.metadata, 'language'),
      });
    }
  }
  for (const [, entry] of sortedFiles) {
    for (const symbol of entry.analysis.symbols ?? []) {
      const key = normalizeAnalysisIdForFile(symbol.id, symbol.filePath, analysisToCachePath) ?? symbol.id;
      symbols.set(key, symbolRecord(key, symbol));
    }
  }

  const edges = new Map<string, EdgeRecord>();
  for (const edge of graphData.edges) {
    addEndpointNode(nodes, edge.from, knownFilePaths);
    addEndpointNode(nodes, edge.to, knownFilePaths);
    edges.set(edgeIdentity(edge.from, edge.to, edge.kind), {
      key: edge.id,
      sourceNodeId: edge.from,
      targetNodeId: edge.to,
      type: edge.kind,
    });
  }
  if (!graph) {
    for (const [, entry] of sortedFiles) {
      for (const relation of entry.analysis.relations ?? []) {
        const endpoints = relationEndpoints(relation, analysisToCachePath);
        if (!endpoints) continue;
        addEndpointNode(nodes, endpoints.from, knownFilePaths);
        addEndpointNode(nodes, endpoints.to, knownFilePaths, endpoints.toType);
        const identity = edgeIdentity(endpoints.from, endpoints.to, relation.kind);
        if (!edges.has(identity)) {
          edges.set(identity, {
            key: `${endpoints.from}->${endpoints.to}#${relation.kind}`,
            sourceNodeId: endpoints.from,
            targetNodeId: endpoints.to,
            type: relation.kind,
          });
        }
      }
    }
  }

  for (const record of nodes.values()) {
    if (record.parentId !== null && !nodes.has(String(record.parentId))) record.parentId = null;
  }

  return {
    files,
    nodes: [...nodes.values()].sort((left, right) => left.key.localeCompare(right.key)),
    symbols: [...symbols.values()].sort((left, right) => left.nodeId.localeCompare(right.nodeId)),
    edges: [...edges.values()].sort((left, right) => left.key.localeCompare(right.key)),
  };
}
