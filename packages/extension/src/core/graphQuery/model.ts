import type { GraphEdgeKind, NodeType } from '../../shared/graph/contracts';

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
