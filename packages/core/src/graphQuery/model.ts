import type { GraphEdgeKind, NodeType } from '../graph/contracts';
import type { IAnalysisRange, IGraphNodeSymbolMetadata } from '@codegraphy-dev/plugin-api';
import type { IGraphNodeTypeDefinition } from '../graphControls/contracts';

export type GraphQueryFilterOperator =
  | 'equals'
  | 'includes'
  | 'startsWith'
  | 'endsWith'
  | 'matches';

export interface GraphQueryFilter {
  field: string;
  op: GraphQueryFilterOperator;
  value: unknown;
}

export interface GraphQueryScope {
  nodes?: Record<string, boolean>;
  edges?: Record<string, boolean>;
}

export interface GraphQuerySort {
  by: string;
  direction?: 'asc' | 'desc';
}

export interface GraphQueryConfig {
  scope?: GraphQueryScope;
  nodeTypeDefinitions?: readonly IGraphNodeTypeDefinition[];
  projectedNodeTypes?: readonly string[];
  filters?: readonly GraphQueryFilter[];
  search?: string;
  sort?: readonly GraphQuerySort[];
  limit?: number;
  offset?: number;
  showOrphans?: boolean;
}

export interface GraphQueryConnectionConfig extends GraphQueryConfig {
  from?: string;
  to?: string;
  edgeType?: GraphEdgeKind;
  expandFileSelectors?: boolean;
  projectFileEndpoints?: boolean;
}

export interface GraphQuerySymbolsConfig extends GraphQueryConfig {
  filePath?: string;
  relatedFrom?: string;
  relatedTo?: string;
  edgeType?: GraphEdgeKind;
}

export interface GraphQueryPathConfig extends GraphQueryConfig {
  from: string;
  to: string;
  maxDepth?: number;
  maxPaths?: number;
  expandFileSelectors?: boolean;
  projectFileEndpoints?: boolean;
}

export interface GraphQuerySearchConfig extends GraphQueryConfig {
  pattern: string;
}

export interface GraphQueryTaskMapConfig extends GraphQueryConfig {
  query: string;
}

export interface GraphQueryOverviewConfig extends GraphQueryConfig {
  target: string;
}

export interface GraphQueryPage {
  offset: number;
  limit: number;
  returned: number;
  total: number;
  nextOffset: number | null;
}

export interface GraphQueryNodeReportItem {
  path: string;
  nodeType: NodeType;
  symbol?: IGraphNodeSymbolMetadata;
}

export interface GraphQueryEdgeReportItem {
  from: string;
  to: string;
  edgeTypes: GraphEdgeKind[];
}

export interface GraphQueryNodeReport {
  nodes: GraphQueryNodeReportItem[];
  page: GraphQueryPage;
}

export interface GraphQueryEdgeReport {
  edges: GraphQueryEdgeReportItem[];
  page: GraphQueryPage;
}

export interface GraphQueryRelationshipSymbol {
  id?: string;
  filePath?: string;
  name: string;
  kind?: string;
  signature?: string;
  range?: IAnalysisRange;
  language?: string;
  source?: string;
  pluginKind?: string;
}

export interface GraphQueryRelationshipProvenance {
  pluginId: string;
  sourceId: string;
}

export interface GraphQueryRelationshipKindGroup {
  edgeType: GraphEdgeKind;
  provenance?: GraphQueryRelationshipProvenance;
  symbols: GraphQueryRelationshipSymbol[];
}

export interface GraphQueryRelationshipReportItem {
  from: string;
  to: string;
  relationships: GraphQueryRelationshipKindGroup[];
}

export interface GraphQueryRelationshipReport {
  relationships: GraphQueryRelationshipReportItem[];
  page: GraphQueryPage;
}

export interface GraphQuerySymbolReportItem {
  id?: string;
  filePath?: string;
  name: string;
  kind?: string;
  signature?: string;
  range?: IAnalysisRange;
  language?: string;
  source?: string;
  pluginKind?: string;
}

export interface GraphQuerySymbolReport {
  symbols: GraphQuerySymbolReportItem[];
  page: GraphQueryPage;
}

export interface GraphQueryPathReport {
  from: string;
  to: string;
  paths: string[][];
  complete: boolean;
  limits: {
    maxDepth: number;
    maxPaths: number;
  };
}

export type GraphQuerySearchMatch =
  | { type: 'node'; node: GraphQueryNodeReportItem }
  | { type: 'symbol'; symbol: GraphQuerySymbolReportItem }
  | {
      type: 'text';
      filePath: string;
      line: number;
      column: number;
      excerpt: string;
    };

export interface GraphQuerySearchReport {
  pattern: string;
  matches: GraphQuerySearchMatch[];
  page: GraphQueryPage;
  sources: {
    text: {
      freshness: 'live';
      filesScanned: number;
      filesSkipped: number;
    };
    symbols: {
      freshness: 'cached';
      cacheState: 'fresh' | 'stale';
    };
  };
}

export interface GraphQueryTaskMapFile {
  path: string;
  nodeType: 'file';
  matchedTerms: string[];
  symbols: { id?: string; name: string; kind?: string }[];
}

export interface GraphQueryTaskMapReport {
  query: string;
  terms: string[];
  files: GraphQueryTaskMapFile[];
  relationships: GraphQueryEdgeReportItem[];
  page: GraphQueryPage;
  limits: {
    relationships: number;
    complete: boolean;
  };
  sources: {
    text: {
      freshness: 'live';
      filesScanned: number;
      filesSkipped: number;
    };
    graph: {
      freshness: 'cached';
      cacheState: 'fresh' | 'stale';
    };
  };
}

export interface GraphQueryOverviewReport {
  target: GraphQueryNodeReportItem;
  declaredSymbols: GraphQuerySymbolReport;
  outgoing: GraphQueryEdgeReport;
  incoming: GraphQueryEdgeReport;
  limits: {
    declaredSymbols: number;
    relationshipsPerDirection: number;
  };
}

export interface GraphQueryTargetNotFoundReport {
  error: 'query_target_not_found';
  message: string;
}

export type GraphQueryReport =
  | 'nodes'
  | 'edges'
  | 'relationships'
  | 'symbols'
  | 'paths'
  | 'search'
  | 'task-map'
  | 'overview';

export type GraphQueryRequest =
  | { report: 'nodes'; arguments?: GraphQueryConfig }
  | { report: 'edges'; arguments?: GraphQueryConnectionConfig }
  | { report: 'relationships'; arguments?: GraphQueryConnectionConfig }
  | { report: 'symbols'; arguments?: GraphQuerySymbolsConfig }
  | { report: 'paths'; arguments: GraphQueryPathConfig }
  | { report: 'search'; arguments: GraphQuerySearchConfig }
  | { report: 'task-map'; arguments: GraphQueryTaskMapConfig }
  | { report: 'overview'; arguments: GraphQueryOverviewConfig };

export type GraphQueryResult =
  | GraphQueryNodeReport
  | GraphQueryEdgeReport
  | GraphQueryRelationshipReport
  | GraphQuerySymbolReport
  | GraphQueryPathReport
  | GraphQuerySearchReport
  | GraphQueryTaskMapReport
  | GraphQueryOverviewReport
  | GraphQueryTargetNotFoundReport;
