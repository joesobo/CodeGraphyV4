import type { GraphEdgeKind, NodeType } from '../graph/contracts';
import type { IAnalysisRange, IGraphNodeSymbolMetadata } from '@codegraphy-dev/plugin-api';

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

export type GraphQueryReport =
  | 'nodes'
  | 'edges'
  | 'relationships'
  | 'symbols'
  | 'paths';

export type GraphQueryRequest =
  | { report: 'nodes'; arguments?: GraphQueryConfig }
  | { report: 'edges'; arguments?: GraphQueryConnectionConfig }
  | { report: 'relationships'; arguments?: GraphQueryConnectionConfig }
  | { report: 'symbols'; arguments?: GraphQuerySymbolsConfig }
  | { report: 'paths'; arguments: GraphQueryPathConfig };

export type GraphQueryResult =
  | GraphQueryNodeReport
  | GraphQueryEdgeReport
  | GraphQueryRelationshipReport
  | GraphQuerySymbolReport
  | GraphQueryPathReport;
