import * as path from 'node:path';
import type {
  GraphMetadata,
  IAnalysisNode,
  IAnalysisRelation,
  IAnalysisSymbol,
  IGraphData,
  IGraphEdge,
  IGraphEdgeSource,
  IGraphNode,
} from '@codegraphy-dev/plugin-api';
import type { IWorkspaceAnalysisCache } from '../../../analysis/cache';
import type { SQLiteValue } from '../io/connection';
import {
  EDGE_COLUMNS,
  EDGE_METADATA_COLUMNS,
  NODE_COLUMNS,
  SYMBOL_COLUMNS,
  type EdgeMetadataRole,
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

function emptyRecord<const Columns extends readonly string[]>(
  columns: Columns,
): Record<Columns[number], SQLiteValue> {
  return Object.fromEntries(columns.map(column => [column, null])) as Record<Columns[number], SQLiteValue>;
}

function sqliteBoolean(value: boolean | undefined): number | null {
  return value === undefined ? null : Number(value);
}

function metadataString(metadata: GraphMetadata | undefined, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === 'string' ? value : null;
}

function metadataBoolean(metadata: GraphMetadata | undefined, key: string): number | null {
  const value = metadata?.[key];
  return typeof value === 'boolean' ? Number(value) : null;
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

function nodeMetadataColumns(metadata: GraphMetadata | undefined): DatabaseRecord {
  return {
    pluginId: metadataString(metadata, 'pluginId'),
    language: metadataString(metadata, 'language'),
    analysisSource: metadataString(metadata, 'source'),
    pluginKind: metadataString(metadata, 'pluginKind'),
    gitIgnored: metadataBoolean(metadata, 'gitIgnored'),
    gitIgnoredReason: metadataString(metadata, 'gitIgnoredReason'),
    unityClass: metadataString(metadata, 'unityClass'),
    unityFileId: metadataString(metadata, 'fileId'),
    unityGameObjectFileId: metadataString(metadata, 'gameObjectFileId'),
    unityScriptGuid: metadataString(metadata, 'scriptGuid'),
    unityScriptPath: metadataString(metadata, 'scriptPath'),
  };
}

function graphNodeRecord(
  node: IGraphNode,
  knownFilePaths: ReadonlySet<string>,
  analysisToCachePath: ReadonlyMap<string, string>,
): NodeRecord {
  return {
    ...emptyRecord(NODE_COLUMNS),
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
    fileSize: node.fileSize ?? null,
    depthLevel: node.depthLevel ?? null,
    shape: node.shape2D ?? null,
    shapeWidth: node.shapeSize2D?.width ?? null,
    shapeHeight: node.shapeSize2D?.height ?? null,
    cornerRadius: node.cornerRadius2D ?? null,
    collisionRadius: node.collisionRadius2D ?? null,
    chargeStrengthMultiplier: node.chargeStrengthMultiplier2D ?? null,
    fillOpacity: node.fillOpacity2D ?? null,
    pointerWidth: node.pointerArea2D?.width ?? null,
    pointerHeight: node.pointerArea2D?.height ?? null,
    imageUrl: node.imageUrl ?? null,
    isCollapsible: sqliteBoolean(node.isCollapsible),
    isCollapsed: sqliteBoolean(node.isCollapsed),
    collapsedDescendantCount: node.collapsedDescendantCount ?? null,
    ...nodeMetadataColumns(node.metadata),
  };
}

function analysisNodeRecord(
  node: IAnalysisNode,
  ownerFilePath: string,
  ownerAnalysisPath: string,
  analysisOrder: number,
  existing: NodeRecord | undefined,
  analysisToCachePath: ReadonlyMap<string, string>,
): NodeRecord {
  const analysisFilePath = node.filePath ?? ownerAnalysisPath;
  const id = normalizeAnalysisIdForFile(node.id, analysisFilePath, analysisToCachePath) ?? node.id;
  return {
    ...emptyRecord(NODE_COLUMNS),
    ...existing,
    key: id,
    type: node.nodeType,
    label: node.label,
    fileId: ownerFilePath,
    parentId: normalizeAnalysisIdForFile(node.parentId, analysisFilePath, analysisToCachePath),
    analysisNodeId: node.id,
    analysisNodeFilePath: node.filePath ?? null,
    analysisParentId: node.parentId ?? null,
    analysisNodeOrder: analysisOrder,
    ...nodeMetadataColumns(node.metadata),
  };
}

function symbolRecord(
  symbol: IAnalysisSymbol,
  analysisOrder: number | null,
  analysisToCachePath: ReadonlyMap<string, string>,
): SymbolRecord {
  const nodeKey = normalizeAnalysisIdForFile(symbol.id, symbol.filePath, analysisToCachePath) ?? symbol.id;
  return {
    ...emptyRecord(SYMBOL_COLUMNS),
    nodeId: nodeKey,
    filePath: symbol.filePath,
    analysisId: analysisOrder === null ? null : symbol.id,
    analysisPath: analysisOrder === null ? null : symbol.filePath,
    analysisOrder,
    pluginId: metadataString(symbol.metadata, 'pluginId'),
    language: metadataString(symbol.metadata, 'language'),
    analysisSource: metadataString(symbol.metadata, 'source'),
    pluginKind: metadataString(symbol.metadata, 'pluginKind'),
    name: symbol.name,
    kind: symbol.kind,
    signature: symbol.signature ?? null,
    startLine: symbol.range?.startLine ?? null,
    startColumn: symbol.range?.startColumn ?? null,
    endLine: symbol.range?.endLine ?? null,
    endColumn: symbol.range?.endColumn ?? null,
  };
}

function edgeMetadataColumns(
  metadata: GraphMetadata | undefined,
  role: EdgeMetadataRole,
): DatabaseRecord {
  return Object.fromEntries(
    Object.entries(EDGE_METADATA_COLUMNS[role])
      .map(([metadataKey, column]) => [column, metadataString(metadata, metadataKey)]),
  );
}

function edgeKey(from: string, to: string, kind: string): string {
  return `${from}\u0000${to}\u0000${kind}`;
}

function physicalEdgeId(graphId: string, sourceKey: string, suffix: string): string {
  return `${graphId}::${sourceKey}::${suffix}`;
}

function relationEndpoints(
  relation: IAnalysisRelation,
  analysisToCachePath: ReadonlyMap<string, string>,
): { from: string; fromType: 'file' | 'symbol'; to: string; toType: 'file' | 'symbol' } | undefined {
  const from = normalizeAnalysisIdForFile(
    relation.fromSymbolId ?? relation.fromNodeId,
    relation.fromFilePath,
    analysisToCachePath,
  )
    ?? normalizeKnownPath(relation.fromFilePath, analysisToCachePath);
  const targetFilePath = relation.resolvedPath ?? relation.toFilePath;
  const to = (targetFilePath
    ? normalizeAnalysisIdForFile(
        relation.toSymbolId ?? relation.toNodeId,
        targetFilePath,
        analysisToCachePath,
      )
    : normalizeAnalysisId(relation.toSymbolId ?? relation.toNodeId, analysisToCachePath))
    ?? normalizeKnownPath(relation.resolvedPath ?? relation.toFilePath, analysisToCachePath);
  return from && to
    ? {
        from,
        fromType: relation.fromSymbolId || relation.fromNodeId ? 'symbol' : 'file',
        to,
        toType: relation.toSymbolId || relation.toNodeId ? 'symbol' : 'file',
      }
    : undefined;
}

function sourceForRelation(
  relation: IAnalysisRelation,
  graphEdge: IGraphEdge | undefined,
): IGraphEdgeSource | undefined {
  return graphEdge?.sources.find(source =>
    source.id === relation.sourceId
    || source.sourceId === relation.sourceId
    || source.id.endsWith(`:${relation.sourceId}`),
  );
}

function createRelationEdgeRecord(
  relation: IAnalysisRelation,
  ownerFilePath: string,
  relationIndex: number,
  graphEdge: IGraphEdge | undefined,
  endpoints: { from: string; to: string },
  canonicalGraphEdge: boolean,
): EdgeRecord {
  const source = sourceForRelation(relation, graphEdge);
  const graphId = graphEdge?.id ?? `${endpoints.from}->${endpoints.to}#${relation.kind}`;
  const sourceKey = source?.sourceId ?? relation.sourceId;
  return {
    ...emptyRecord(EDGE_COLUMNS),
    key: physicalEdgeId(graphId, sourceKey, `${ownerFilePath}:${relationIndex}`),
    graphKey: graphId,
    sourceNodeId: endpoints.from,
    targetNodeId: endpoints.to,
    type: relation.kind,
    ownerFileId: ownerFilePath,
    color: graphEdge?.color ?? null,
    sourcePluginId: source?.pluginId ?? null,
    relationPluginId: relation.pluginId ?? null,
    sourceKey: source?.id ?? relation.sourceId,
    pluginSourceId: sourceKey,
    analysisSourceId: relation.sourceId,
    sourceLabel: source?.label ?? relation.sourceId,
    variant: relation.variant ?? source?.variant ?? null,
    relationSpecifier: relation.specifier ?? null,
    resolvedPath: relation.resolvedPath ?? null,
    relationType: relation.type ?? null,
    fromFilePath: relation.fromFilePath,
    toFilePath: relation.toFilePath ?? null,
    fromAnalysisNodeId: relation.fromNodeId ?? null,
    toAnalysisNodeId: relation.toNodeId ?? null,
    fromSymbolId: relation.fromSymbolId ?? null,
    toSymbolId: relation.toSymbolId ?? null,
    analysisRelation: 1,
    analysisOrder: relationIndex,
    canonicalGraphEdge: Number(canonicalGraphEdge),
    ...edgeMetadataColumns(graphEdge?.metadata, 'edge'),
    ...edgeMetadataColumns(source?.metadata, 'source'),
    ...edgeMetadataColumns(relation.metadata, 'relation'),
  };
}

function createGraphEdgeRecord(
  edge: IGraphEdge,
  source: IGraphEdgeSource | undefined,
  sourceIndex: number,
): EdgeRecord {
  const sourceKey = source?.sourceId ?? 'graph';
  return {
    ...emptyRecord(EDGE_COLUMNS),
    key: physicalEdgeId(edge.id, sourceKey, `graph:${sourceIndex}`),
    graphKey: edge.id,
    sourceNodeId: edge.from,
    targetNodeId: edge.to,
    type: edge.kind,
    color: edge.color ?? null,
    sourcePluginId: source?.pluginId ?? null,
    sourceKey: source?.id ?? null,
    pluginSourceId: source?.sourceId ?? null,
    sourceLabel: source?.label ?? null,
    variant: source?.variant ?? null,
    analysisRelation: 0,
    analysisOrder: null,
    canonicalGraphEdge: 1,
    ...edgeMetadataColumns(edge.metadata, 'edge'),
    ...edgeMetadataColumns(source?.metadata, 'source'),
  };
}

function addEndpointNode(
  nodes: Map<string, NodeRecord>,
  id: string,
  knownFilePaths: ReadonlySet<string>,
  type: 'file' | 'symbol' = knownFilePaths.has(id) ? 'file' : 'symbol',
): void {
  if (nodes.has(id)) return;
  nodes.set(id, {
    ...emptyRecord(NODE_COLUMNS),
    key: id,
    type,
    label: path.basename(id),
    fileId: knownFilePaths.has(id) ? id : null,
    parentId: null,
    color: '#808080',
  });
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
    analysisPath: entry.analysis.filePath,
    mtime: entry.mtime ?? 0,
    size: entry.size ?? -1,
    contentHash: entry.contentHash ?? null,
  }));

  const nodes = new Map<string, NodeRecord>();
  for (const node of graphData.nodes) {
    nodes.set(node.id, graphNodeRecord(node, knownFilePaths, analysisToCachePath));
  }
  for (const [filePath] of sortedFiles) {
    if (!nodes.has(filePath)) {
      addEndpointNode(nodes, filePath, knownFilePaths);
    }
  }
  for (const [filePath, entry] of sortedFiles) {
    for (const [analysisOrder, node] of (entry.analysis.nodes ?? []).entries()) {
      const id = normalizeAnalysisIdForFile(
        node.id,
        node.filePath ?? entry.analysis.filePath,
        analysisToCachePath,
      ) ?? node.id;
      nodes.set(id, analysisNodeRecord(
        node,
        filePath,
        entry.analysis.filePath,
        analysisOrder,
        nodes.get(id),
        analysisToCachePath,
      ));
    }
    for (const symbol of entry.analysis.symbols ?? []) {
      const id = normalizeAnalysisIdForFile(symbol.id, symbol.filePath, analysisToCachePath) ?? symbol.id;
      if (!nodes.has(id)) {
        addEndpointNode(nodes, id, knownFilePaths, 'symbol');
      }
      const symbolNode = nodes.get(id);
      if (symbolNode) {
        if (symbolNode.fileId === null) symbolNode.fileId = filePath;
        if (symbolNode.type === 'symbol') symbolNode.label = symbol.name;
      }
    }
  }

  const symbols = new Map<string, SymbolRecord>();
  for (const node of graphData.nodes) {
    if (node.symbol) {
      symbols.set(node.id, symbolRecord(node.symbol, null, analysisToCachePath));
    }
  }
  for (const [, entry] of sortedFiles) {
    for (const [analysisOrder, symbol] of (entry.analysis.symbols ?? []).entries()) {
      const nodeKey = normalizeAnalysisIdForFile(symbol.id, symbol.filePath, analysisToCachePath) ?? symbol.id;
      symbols.set(nodeKey, symbolRecord(symbol, analysisOrder, analysisToCachePath));
    }
  }

  const graphEdgesByKey = new Map(graphData.edges.map(edge => [edgeKey(edge.from, edge.to, edge.kind), edge]));
  const edges: EdgeRecord[] = [];
  const representedSources = new Set<string>();
  for (const [filePath, entry] of sortedFiles) {
    for (const [relationIndex, relation] of (entry.analysis.relations ?? []).entries()) {
      const endpoints = relationEndpoints(relation, analysisToCachePath);
      if (!endpoints) continue;
      addEndpointNode(nodes, endpoints.from, knownFilePaths, endpoints.fromType);
      addEndpointNode(nodes, endpoints.to, knownFilePaths, endpoints.toType);
      const graphEdge = graphEdgesByKey.get(edgeKey(endpoints.from, endpoints.to, relation.kind));
      const record = createRelationEdgeRecord(
        relation,
        filePath,
        relationIndex,
        graphEdge,
        endpoints,
        graph === undefined || graphEdge !== undefined,
      );
      edges.push(record);
      representedSources.add(`${String(record.graphKey)}\u0000${String(record.sourceKey ?? '')}`);
    }
  }

  for (const edge of graphData.edges) {
    const sources: Array<IGraphEdgeSource | undefined> = edge.sources.length > 0
      ? edge.sources
      : [undefined];
    sources.forEach((source, sourceIndex) => {
      const key = `${edge.id}\u0000${source?.id ?? ''}`;
      if (!representedSources.has(key)) {
        edges.push(createGraphEdgeRecord(edge, source, sourceIndex));
      }
    });
  }

  for (const record of nodes.values()) {
    if (record.parentId !== null && !nodes.has(String(record.parentId))) {
      record.parentId = null;
    }
  }

  return {
    files,
    nodes: [...nodes.values()].sort((left, right) => String(left.key).localeCompare(String(right.key))),
    symbols: [...symbols.values()].sort((left, right) => String(left.nodeId).localeCompare(String(right.nodeId))),
    edges: edges.sort((left, right) => String(left.key).localeCompare(String(right.key))),
  };
}
