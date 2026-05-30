import type { IGraphData } from '../graph/contracts';

export interface GraphModelScopeItem {
  type: string;
  enabled: boolean;
}

export interface GraphModelScopeConfig {
  nodes: GraphModelScopeItem[];
  edges: GraphModelScopeItem[];
}

export interface GraphModelFilterConfig {
  patterns: readonly string[];
}

export interface GraphModelSearchOptions {
  matchCase?: boolean;
  wholeWord?: boolean;
  regex?: boolean;
}

export interface GraphModelSearchConfig {
  query: string;
  options?: GraphModelSearchOptions;
}

export interface GraphModelCollapseConfig {
  collapsedNodeIds: readonly string[];
}

export interface GraphModelConfig {
  scope?: GraphModelScopeConfig;
  filter?: GraphModelFilterConfig;
  search?: GraphModelSearchConfig;
  collapse?: GraphModelCollapseConfig;
  showOrphans?: boolean;
}

export interface GraphModelResult {
  graphData: IGraphData | null;
  regexError: string | null;
}
