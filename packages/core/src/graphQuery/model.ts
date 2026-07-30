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
  projectedEdgeTypes?: readonly GraphEdgeKind[];
}

export interface GraphQueryChangeImpactConfig extends GraphQueryConfig {
  targets: readonly string[];
  maxDepth?: number;
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

export interface GraphQueryChangeImpactTarget {
  path: string;
  nodeType: NodeType;
  filePath: string;
  symbol?: IGraphNodeSymbolMetadata;
}

export interface GraphQueryChangeImpactRelationship {
  from: string;
  to: string;
  edgeType: GraphEdgeKind;
}

export interface GraphQueryChangeImpactEvidence {
  nodes: string[];
  relationships: GraphQueryChangeImpactRelationship[];
}

export interface GraphQueryChangeImpactAffectedFile {
  path: string;
  category: 'source' | 'test';
  distance: number;
  symbols: GraphQueryRelationshipSymbol[];
  evidence: GraphQueryChangeImpactEvidence;
}

export interface GraphQueryChangeImpactPackageBoundary {
  from: string;
  to: string;
}

export interface GraphQueryChangeImpactReport {
  targets: GraphQueryChangeImpactTarget[];
  affected: GraphQueryChangeImpactAffectedFile[];
  tests: Array<{
    path: string;
    distance: number;
    evidence: GraphQueryChangeImpactEvidence;
  }>;
  boundaries: {
    packages: GraphQueryChangeImpactPackageBoundary[];
    public: GraphQueryChangeImpactRelationship[];
  };
  limits: {
    maxDepth: number;
    affectedFiles: number;
    visitedNodes: number;
    complete: boolean;
    truncationReasons: Array<'affected-files' | 'max-depth' | 'visited-nodes'>;
  };
  sources: {
    graph: {
      freshness: 'cached';
      cacheState: 'fresh' | 'stale';
    };
    ranking: {
      method: 'shortest incoming typed Relationship path, then source before test, then path';
    };
    heuristics: {
      tests: 'File path uses a tests directory or .test/.spec suffix';
      publicBoundaries: 'reexport Relationships only';
      packageBoundaries: 'nearest indexed package.json roots differ';
    };
  };
  error?: 'change_impact_target_not_found';
  message?: string;
  missingTargets?: string[];
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
  | 'change-impact'
  | 'overview';

export type GraphQueryRequest =
  | { report: 'nodes'; arguments?: GraphQueryConfig }
  | { report: 'edges'; arguments?: GraphQueryConnectionConfig }
  | { report: 'relationships'; arguments?: GraphQueryConnectionConfig }
  | { report: 'symbols'; arguments?: GraphQuerySymbolsConfig }
  | { report: 'paths'; arguments: GraphQueryPathConfig }
  | { report: 'search'; arguments: GraphQuerySearchConfig }
  | { report: 'task-map'; arguments: GraphQueryTaskMapConfig }
  | { report: 'change-impact'; arguments: GraphQueryChangeImpactConfig }
  | { report: 'overview'; arguments: GraphQueryOverviewConfig };

export type GraphQueryResult =
  | GraphQueryNodeReport
  | GraphQueryEdgeReport
  | GraphQueryRelationshipReport
  | GraphQuerySymbolReport
  | GraphQueryPathReport
  | GraphQuerySearchReport
  | GraphQueryTaskMapReport
  | GraphQueryChangeImpactReport
  | GraphQueryOverviewReport
  | GraphQueryTargetNotFoundReport;
