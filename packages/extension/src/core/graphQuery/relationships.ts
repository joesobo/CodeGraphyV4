import type { GraphEdgeKind, IGraphEdge } from '../../shared/graph/contracts';
import type { IAnalysisRelation, IAnalysisSymbol } from '../plugins/types/contracts';
import { applyReportFilters } from './filter';
import type { GraphQueryData } from './data';
import type {
  GraphQueryConnectionConfig,
  GraphQueryRelationshipKindGroup,
  GraphQueryRelationshipProvenance,
  GraphQueryRelationshipReport,
  GraphQueryRelationshipReportItem,
  GraphQueryRelationshipSymbol,
} from './model';
import { paginate } from './pagination';
import { sortItems } from './sort';
import {
  applySearchAndOrphans,
  deriveScopedGraphQueryData,
  filterEdgesToReportNodes,
} from './visible';

const TREE_SITTER_PLUGIN_ID = 'codegraphy.treesitter';

interface RelationshipEvidence {
  from: string;
  to: string;
  edgeType: GraphEdgeKind;
  provenance?: GraphQueryRelationshipProvenance;
  symbol?: GraphQueryRelationshipSymbol;
}

function relationFrom(relation: IAnalysisRelation): string {
  return relation.fromNodeId ?? relation.fromFilePath;
}

function relationTo(relation: IAnalysisRelation): string | undefined {
  return relation.toNodeId ?? relation.toFilePath ?? undefined;
}

function createSymbolMap(symbols: readonly IAnalysisSymbol[] | undefined): Map<string, IAnalysisSymbol> {
  return new Map((symbols ?? []).map((symbol) => [symbol.id, symbol]));
}

function shouldIncludeSymbolKind(edgeType: GraphEdgeKind, symbol: IAnalysisSymbol): boolean {
  return edgeType !== 'type-import' && symbol.kind.length > 0;
}

function readSymbolMetadata(symbol: IAnalysisSymbol, field: string): string | undefined {
  const value = symbol.metadata?.[field];
  return typeof value === 'string' ? value : undefined;
}

function createSymbolMetadata(symbol: IAnalysisSymbol): Partial<GraphQueryRelationshipSymbol> {
  return {
    ...(symbol.signature ? { signature: symbol.signature } : {}),
    ...(symbol.range ? { range: symbol.range } : {}),
    ...(readSymbolMetadata(symbol, 'language') ? { language: readSymbolMetadata(symbol, 'language') } : {}),
    ...(readSymbolMetadata(symbol, 'source') ? { source: readSymbolMetadata(symbol, 'source') } : {}),
    ...(readSymbolMetadata(symbol, 'pluginKind') ? { pluginKind: readSymbolMetadata(symbol, 'pluginKind') } : {}),
  };
}

function createRelationshipSymbol(
  edgeType: GraphEdgeKind,
  relation: IAnalysisRelation,
  symbolById: ReadonlyMap<string, IAnalysisSymbol>,
): GraphQueryRelationshipSymbol | undefined {
  const symbolId = relation.toSymbolId ?? relation.fromSymbolId;
  if (!symbolId) {
    return undefined;
  }

  const symbol = symbolById.get(symbolId);
  if (!symbol) {
    return undefined;
  }

  return {
    id: symbol.id,
    filePath: symbol.filePath,
    name: symbol.name,
    ...(shouldIncludeSymbolKind(edgeType, symbol) ? { kind: symbol.kind } : {}),
    ...createSymbolMetadata(symbol),
  };
}

function createProvenance(relation: IAnalysisRelation): GraphQueryRelationshipProvenance | undefined {
  if (!relation.pluginId || relation.pluginId === TREE_SITTER_PLUGIN_ID) {
    return undefined;
  }

  return {
    pluginId: relation.pluginId,
    sourceId: relation.sourceId,
  };
}

function edgeKey(edge: Pick<IGraphEdge, 'from' | 'kind' | 'to'>): string {
  return `${edge.from}\u0000${edge.to}\u0000${edge.kind}`;
}

function createVisibleEdgeSet(data: GraphQueryData, config: GraphQueryConnectionConfig): Set<string> {
  const scopedGraph = deriveScopedGraphQueryData(data.graphData, config);
  const domainFilteredEdges = applyDomainConnectionFilters(
    filterEdgesToReportNodes(scopedGraph.edges, scopedGraph.nodes),
    config,
  );
  const visibleGraph = applySearchAndOrphans({
    nodes: scopedGraph.nodes,
    edges: domainFilteredEdges,
  }, config);

  return new Set(filterEdgesToReportNodes(visibleGraph.edges, visibleGraph.nodes).map(edgeKey));
}

function applyDomainConnectionFilters<T extends { from: string; to: string; kind: GraphEdgeKind }>(
  items: readonly T[],
  config: GraphQueryConnectionConfig,
): T[] {
  return items.filter((item) => {
    if (config.from && item.from !== config.from) {
      return false;
    }
    if (config.to && item.to !== config.to) {
      return false;
    }
    if (config.edgeType && item.kind !== config.edgeType) {
      return false;
    }
    return true;
  });
}

function createRelationEvidence(
  relations: readonly IAnalysisRelation[] | undefined,
  symbolById: ReadonlyMap<string, IAnalysisSymbol>,
  visibleEdgeKeys: ReadonlySet<string>,
): RelationshipEvidence[] {
  return (relations ?? []).flatMap((relation) => {
    const to = relationTo(relation);
    if (!to) {
      return [];
    }

    const evidence = {
      from: relationFrom(relation),
      to,
      edgeType: relation.kind,
    };

    if (!visibleEdgeKeys.has(edgeKey({ ...evidence, kind: evidence.edgeType }))) {
      return [];
    }

    return [{
      ...evidence,
      provenance: createProvenance(relation),
      symbol: createRelationshipSymbol(relation.kind, relation, symbolById),
    }];
  });
}

function createStructuralEvidence(
  data: GraphQueryData,
  config: GraphQueryConnectionConfig,
  visibleEdgeKeys: ReadonlySet<string>,
): RelationshipEvidence[] {
  const scopedGraph = deriveScopedGraphQueryData(data.graphData, config);
  return scopedGraph.edges
    .filter((edge) => edge.kind === 'nests')
    .filter((edge) => visibleEdgeKeys.has(edgeKey(edge)))
    .map((edge) => ({
      from: edge.from,
      to: edge.to,
      edgeType: edge.kind,
    }));
}

function evidenceGroupKey(evidence: RelationshipEvidence): string {
  return `${evidence.from}\u0000${evidence.to}`;
}

function relationshipGroupKey(evidence: RelationshipEvidence): string {
  return `${evidence.edgeType}\u0000${evidence.provenance?.pluginId ?? ''}\u0000${evidence.provenance?.sourceId ?? ''}`;
}

function symbolKey(symbol: GraphQueryRelationshipSymbol): string {
  return `${symbol.name}\u0000${symbol.kind ?? ''}\u0000${symbol.range?.startLine ?? ''}\u0000${symbol.range?.endLine ?? ''}`;
}

function appendSymbol(
  relationship: GraphQueryRelationshipKindGroup,
  symbol: GraphQueryRelationshipSymbol | undefined,
): void {
  if (!symbol) {
    return;
  }

  if (!relationship.symbols.some((item) => symbolKey(item) === symbolKey(symbol))) {
    relationship.symbols.push(symbol);
  }
}

function groupRelationshipEvidence(evidenceItems: readonly RelationshipEvidence[]): GraphQueryRelationshipReportItem[] {
  const groups = new Map<string, GraphQueryRelationshipReportItem>();
  const relationshipIndexes = new Map<string, Map<string, GraphQueryRelationshipKindGroup>>();

  for (const evidence of evidenceItems) {
    const groupKey = evidenceGroupKey(evidence);
    let group = groups.get(groupKey);
    let relationshipsByKey = relationshipIndexes.get(groupKey);

    if (!group) {
      group = {
        from: evidence.from,
        to: evidence.to,
        relationships: [],
      };
      groups.set(groupKey, group);
      relationshipsByKey = new Map();
      relationshipIndexes.set(groupKey, relationshipsByKey);
    }

    const relationshipKey = relationshipGroupKey(evidence);
    let relationship = relationshipsByKey?.get(relationshipKey);
    if (!relationship) {
      relationship = {
        edgeType: evidence.edgeType,
        ...(evidence.provenance ? { provenance: evidence.provenance } : {}),
        symbols: [],
      };
      group.relationships.push(relationship);
      relationshipsByKey?.set(relationshipKey, relationship);
    }

    appendSymbol(relationship, evidence.symbol);
  }

  return [...groups.values()].map((group) => ({
    ...group,
    relationships: sortItems(
      group.relationships,
      undefined,
      [{ by: 'edgeType', direction: 'asc' }],
      (item, field) => field === 'edgeType' ? item.edgeType : '',
    ),
  }));
}

function readRelationshipReportValue(item: GraphQueryRelationshipReportItem, field: string): string | readonly string[] {
  switch (field) {
    case 'from':
      return item.from;
    case 'to':
      return item.to;
    case 'edgeType':
    case 'edgeTypes':
      return item.relationships.map((relationship) => relationship.edgeType);
    default:
      return '';
  }
}

export function listGraphRelationships(
  data: GraphQueryData,
  config: GraphQueryConnectionConfig = {},
): GraphQueryRelationshipReport {
  const visibleEdgeKeys = createVisibleEdgeSet(data, config);
  const symbolById = createSymbolMap(data.symbols);
  const evidenceItems = [
    ...createRelationEvidence(data.relations, symbolById, visibleEdgeKeys),
    ...createStructuralEvidence(data, config, visibleEdgeKeys),
  ];
  const filteredEvidence = applyDomainConnectionFilters(
    evidenceItems.map((item) => ({ ...item, kind: item.edgeType })),
    config,
  );
  const groupedRelationships = groupRelationshipEvidence(filteredEvidence);
  const filteredRelationships = applyReportFilters(
    groupedRelationships,
    config.filters,
    readRelationshipReportValue,
  );
  const sortedRelationships = sortItems(
    filteredRelationships,
    config.sort,
    [
      { by: 'from', direction: 'asc' },
      { by: 'to', direction: 'asc' },
    ],
    readRelationshipReportValue,
  );
  const page = paginate(sortedRelationships, config);

  return {
    relationships: page.items,
    page: page.page,
  };
}
