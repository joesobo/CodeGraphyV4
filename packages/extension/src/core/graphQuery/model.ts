import type { GraphEdgeKind, NodeType } from '../../shared/graph/contracts';
import type { IAnalysisRange } from '../plugins/types/contracts';

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
}

export interface GraphQuerySymbolsConfig extends GraphQueryConfig {
  filePath?: string;
  relatedFrom?: string;
  relatedTo?: string;
  edgeType?: GraphEdgeKind;
}

export interface GraphQueryPathConfig {
  from: string;
  to: string;
  maxDepth?: number;
  maxPaths?: number;
}

export interface GraphQueryPage {
  offset: number;
  limit: number;
  returned: number;
  total: number;
}

export interface GraphQueryNodeReportItem {
  path: string;
  nodeType: NodeType;
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
  name: string;
  kind?: string;
  range?: IAnalysisRange;
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
  filePath?: string;
  name: string;
  kind?: string;
  range?: IAnalysisRange;
}

export interface GraphQuerySymbolReport {
  symbols: GraphQuerySymbolReportItem[];
  page: GraphQueryPage;
}

export interface GraphQueryPathReport {
  from: string;
  to: string;
  paths: string[][];
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
