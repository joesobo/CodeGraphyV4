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
  CACHE_TIER_EDGE_TYPE,
  CACHE_TIER_NODE_PREFIX,
  CACHE_TIER_NODE_TYPE,
} from './contracts';

export type DatabaseRecord = Record<string, SQLiteValue>;

export interface NormalizedDatabaseRecords {
  files: DatabaseRecord[];
  nodes: DatabaseRecord[];
  edges: DatabaseRecord[];
}

const NODE_OPTIONAL_COLUMNS = [
  'color', 'x', 'y', 'favorite', 'fileSize', 'depthLevel', 'shape', 'shapeWidth',
  'shapeHeight', 'cornerRadius', 'collisionRadius', 'chargeStrengthMultiplier',
  'fillOpacity', 'pointerWidth', 'pointerHeight', 'imageUrl', 'isCollapsible',
  'isCollapsed', 'collapsedDescendantCount', 'analysisNodeId', 'analysisNodeFilePath',
  'analysisParentId', 'analysisNodeOrder', 'analysisSymbolId', 'analysisSymbolFilePath',
  'analysisSymbolOrder', 'pluginId',
  'language', 'analysisSource', 'pluginKind', 'symbolName', 'symbolKind', 'symbolSignature',
  'startLine', 'startColumn', 'endLine', 'endColumn', 'gitIgnored', 'gitIgnoredReason',
  'unityClass', 'unityFileId', 'unityGameObjectFileId', 'unityScriptGuid', 'unityScriptPath',
] as const;

const EDGE_OPTIONAL_COLUMNS = [
  'ownerFilePath', 'color', 'sourcePluginId', 'relationPluginId', 'sourceKey',
  'pluginSourceId', 'analysisSourceId', 'sourceLabel', 'variant',
  'specifier', 'resolvedPath', 'relationType', 'fromFilePath', 'toFilePath',
  'fromAnalysisNodeId', 'toAnalysisNodeId', 'fromSymbolId', 'toSymbolId', 'language',
  'analysisSource', 'bindingKind', 'importedName', 'localName', 'memberName', 'signalName',
  'eventMethodName', 'targetFileId', 'targetScriptPath', 'targetScriptGuid', 'scriptGuid',
  'prefabGuid', 'fieldName', 'guid',
  'analysisOrder',
  'canonicalGraphEdge',
] as const;

interface TieredAnalysis {
  cache?: { tiers?: string[] };
}

function emptyRecord(columns: readonly string[]): DatabaseRecord {
  return Object.fromEntries(columns.map(column => [column, null]));
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
  const normalized = normalizeKnownPath(candidate, analysisToCachePath);
  return normalized && knownFilePaths.has(normalized) ? normalized : null;
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
): DatabaseRecord {
  const symbol = node.symbol;
  return {
    ...emptyRecord(NODE_OPTIONAL_COLUMNS),
    id: node.id,
    type: node.nodeType ?? 'file',
    label: node.label,
    filePath: graphNodeFilePath(node, knownFilePaths, analysisToCachePath),
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
    symbolName: symbol?.name ?? null,
    symbolKind: symbol?.kind ?? null,
    symbolSignature: symbol?.signature ?? null,
    startLine: symbol?.range?.startLine ?? null,
    startColumn: symbol?.range?.startColumn ?? null,
    endLine: symbol?.range?.endLine ?? null,
    endColumn: symbol?.range?.endColumn ?? null,
    language: symbol?.language ?? null,
    analysisSource: symbol?.source ?? null,
    pluginKind: symbol?.pluginKind ?? null,
    ...nodeMetadataColumns(node.metadata),
  };
}

function analysisNodeRecord(
  node: IAnalysisNode,
  ownerFilePath: string,
  analysisOrder: number,
  existing: DatabaseRecord | undefined,
  analysisToCachePath: ReadonlyMap<string, string>,
): DatabaseRecord {
  const id = normalizeAnalysisId(node.id, analysisToCachePath) ?? node.id;
  return {
    ...emptyRecord(NODE_OPTIONAL_COLUMNS),
    ...existing,
    id,
    type: node.nodeType,
    label: node.label,
    filePath: ownerFilePath,
    parentId: normalizeAnalysisId(node.parentId, analysisToCachePath),
    analysisNodeId: node.id,
    analysisNodeFilePath: node.filePath ?? null,
    analysisParentId: node.parentId ?? null,
    analysisNodeOrder: analysisOrder,
    ...nodeMetadataColumns(node.metadata),
  };
}

function analysisSymbolRecord(
  symbol: IAnalysisSymbol,
  ownerFilePath: string,
  analysisOrder: number,
  existing: DatabaseRecord | undefined,
  analysisToCachePath: ReadonlyMap<string, string>,
): DatabaseRecord {
  const id = normalizeAnalysisId(symbol.id, analysisToCachePath) ?? symbol.id;
  return {
    ...emptyRecord(NODE_OPTIONAL_COLUMNS),
    ...existing,
    id,
    type: existing?.type ?? 'symbol',
    label: existing?.label ?? symbol.name,
    filePath: ownerFilePath,
    parentId: existing?.parentId ?? null,
    color: existing?.color ?? '#808080',
    analysisSymbolId: symbol.id,
    analysisSymbolFilePath: symbol.filePath,
    analysisSymbolOrder: analysisOrder,
    pluginId: metadataString(symbol.metadata, 'pluginId'),
    language: metadataString(symbol.metadata, 'language'),
    analysisSource: metadataString(symbol.metadata, 'source'),
    pluginKind: metadataString(symbol.metadata, 'pluginKind'),
    symbolName: symbol.name,
    symbolKind: symbol.kind,
    symbolSignature: symbol.signature ?? null,
    startLine: symbol.range?.startLine ?? null,
    startColumn: symbol.range?.startColumn ?? null,
    endLine: symbol.range?.endLine ?? null,
    endColumn: symbol.range?.endColumn ?? null,
  };
}

function edgeMetadataColumns(metadata: GraphMetadata | undefined): DatabaseRecord {
  return {
    language: metadataString(metadata, 'language'),
    analysisSource: metadataString(metadata, 'source'),
    bindingKind: metadataString(metadata, 'bindingKind'),
    importedName: metadataString(metadata, 'importedName'),
    localName: metadataString(metadata, 'localName'),
    memberName: metadataString(metadata, 'memberName'),
    signalName: metadataString(metadata, 'signalName'),
    eventMethodName: metadataString(metadata, 'eventMethodName'),
    targetFileId: metadataString(metadata, 'targetFileId'),
    targetScriptPath: metadataString(metadata, 'targetScriptPath'),
    targetScriptGuid: metadataString(metadata, 'targetScriptGuid'),
    scriptGuid: metadataString(metadata, 'scriptGuid'),
    prefabGuid: metadataString(metadata, 'prefabGuid'),
    fieldName: metadataString(metadata, 'fieldName'),
    guid: metadataString(metadata, 'guid'),
  };
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
  const from = normalizeAnalysisId(relation.fromSymbolId ?? relation.fromNodeId, analysisToCachePath)
    ?? normalizeKnownPath(relation.fromFilePath, analysisToCachePath);
  const to = normalizeAnalysisId(relation.toSymbolId ?? relation.toNodeId, analysisToCachePath)
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
): DatabaseRecord {
  const source = sourceForRelation(relation, graphEdge);
  const graphId = graphEdge?.id ?? `${endpoints.from}->${endpoints.to}#${relation.kind}`;
  const sourceKey = source?.sourceId ?? relation.sourceId;
  return {
    ...emptyRecord(EDGE_OPTIONAL_COLUMNS),
    id: physicalEdgeId(graphId, sourceKey, `${ownerFilePath}:${relationIndex}`),
    graphId,
    sourceNodeId: endpoints.from,
    targetNodeId: endpoints.to,
    type: relation.kind,
    ownerFilePath,
    color: graphEdge?.color ?? null,
    sourcePluginId: source?.pluginId ?? null,
    relationPluginId: relation.pluginId ?? null,
    sourceKey: source?.id ?? relation.sourceId,
    pluginSourceId: sourceKey,
    analysisSourceId: relation.sourceId,
    sourceLabel: source?.label ?? relation.sourceId,
    variant: relation.variant ?? source?.variant ?? null,
    specifier: relation.specifier ?? null,
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
    ...edgeMetadataColumns(graphEdge?.metadata),
    ...edgeMetadataColumns(source?.metadata),
    ...edgeMetadataColumns(relation.metadata),
  };
}

function createGraphEdgeRecord(
  edge: IGraphEdge,
  source: IGraphEdgeSource | undefined,
  sourceIndex: number,
): DatabaseRecord {
  const sourceKey = source?.sourceId ?? 'graph';
  return {
    ...emptyRecord(EDGE_OPTIONAL_COLUMNS),
    id: physicalEdgeId(edge.id, sourceKey, `graph:${sourceIndex}`),
    graphId: edge.id,
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
    ...edgeMetadataColumns(edge.metadata),
    ...edgeMetadataColumns(source?.metadata),
  };
}

function addEndpointNode(
  nodes: Map<string, DatabaseRecord>,
  id: string,
  knownFilePaths: ReadonlySet<string>,
  type: 'file' | 'symbol' = knownFilePaths.has(id) ? 'file' : 'symbol',
): void {
  if (nodes.has(id)) return;
  nodes.set(id, {
    ...emptyRecord(NODE_OPTIONAL_COLUMNS),
    id,
    type,
    label: path.basename(id),
    filePath: knownFilePaths.has(id) ? id : null,
    parentId: null,
    color: '#808080',
  });
}

export function normalizeDatabaseRecords(
  cache: IWorkspaceAnalysisCache,
  graph?: IGraphData,
): NormalizedDatabaseRecords {
  const graphData = graph ?? { nodes: [], edges: [] };
  const sortedFiles = Object.entries(cache.files).sort(([left], [right]) => left.localeCompare(right));
  const knownFilePaths = new Set(sortedFiles.map(([filePath]) => filePath));
  const analysisToCachePath = new Map(sortedFiles.map(([filePath, entry]) => [entry.analysis.filePath, filePath]));
  const files: DatabaseRecord[] = sortedFiles.map(([filePath, entry]) => ({
    path: filePath,
    analysisPath: entry.analysis.filePath,
    mtime: entry.mtime ?? 0,
    size: entry.size ?? -1,
    contentHash: entry.contentHash ?? null,
    nodesIndexed: Number(entry.analysis.nodes !== undefined),
    symbolsIndexed: Number(entry.analysis.symbols !== undefined),
    relationsIndexed: Number(entry.analysis.relations !== undefined),
    cacheTiersIndexed: Number((entry.analysis as TieredAnalysis).cache?.tiers !== undefined),
  }));

  const nodes = new Map<string, DatabaseRecord>();
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
      const id = normalizeAnalysisId(node.id, analysisToCachePath) ?? node.id;
      nodes.set(id, analysisNodeRecord(node, filePath, analysisOrder, nodes.get(id), analysisToCachePath));
    }
    for (const [analysisOrder, symbol] of (entry.analysis.symbols ?? []).entries()) {
      const id = normalizeAnalysisId(symbol.id, analysisToCachePath) ?? symbol.id;
      nodes.set(id, analysisSymbolRecord(symbol, filePath, analysisOrder, nodes.get(id), analysisToCachePath));
    }
  }

  const cacheTierEdges: DatabaseRecord[] = [];
  for (const [filePath, entry] of sortedFiles) {
    const tiers = (entry.analysis as TieredAnalysis).cache?.tiers ?? [];
    tiers.forEach((tier, tierIndex) => {
      const tierNodeId = `${CACHE_TIER_NODE_PREFIX}${encodeURIComponent(tier)}`;
      if (!nodes.has(tierNodeId)) {
        nodes.set(tierNodeId, {
          ...emptyRecord(NODE_OPTIONAL_COLUMNS),
          id: tierNodeId,
          type: CACHE_TIER_NODE_TYPE,
          label: tier,
          filePath: null,
          parentId: null,
          color: '#808080',
        });
      }
      cacheTierEdges.push({
        ...emptyRecord(EDGE_OPTIONAL_COLUMNS),
        id: `${filePath}->${tierNodeId}#${CACHE_TIER_EDGE_TYPE}`,
        graphId: `${filePath}->${tierNodeId}#${CACHE_TIER_EDGE_TYPE}`,
        sourceNodeId: filePath,
        targetNodeId: tierNodeId,
        type: CACHE_TIER_EDGE_TYPE,
        ownerFilePath: filePath,
        analysisRelation: 0,
        analysisOrder: tierIndex,
        canonicalGraphEdge: 0,
      });
    });
  }

  const graphEdgesByKey = new Map(graphData.edges.map(edge => [edgeKey(edge.from, edge.to, edge.kind), edge]));
  const edges: DatabaseRecord[] = [...cacheTierEdges];
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
      representedSources.add(`${String(record.graphId)}\u0000${String(record.sourceKey ?? '')}`);
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
    nodes: [...nodes.values()].sort((left, right) => String(left.id).localeCompare(String(right.id))),
    edges: edges.sort((left, right) => String(left.id).localeCompare(String(right.id))),
  };
}
