import type { IGraphData } from '../graph/contracts';

export interface VisibleGraphScopeItem {
  type: string;
  enabled: boolean;
}

export interface VisibleGraphScopeConfig {
  nodes: VisibleGraphScopeItem[];
  edges: VisibleGraphScopeItem[];
}

export interface VisibleGraphFilterConfig {
  patterns: readonly string[];
}

export interface VisibleGraphSearchOptions {
  matchCase?: boolean;
  wholeWord?: boolean;
  regex?: boolean;
}

export interface VisibleGraphSearchConfig {
  query: string;
  options?: VisibleGraphSearchOptions;
}

export interface VisibleGraphConfig {
  scope?: VisibleGraphScopeConfig;
  filter?: VisibleGraphFilterConfig;
  search?: VisibleGraphSearchConfig;
  showOrphans?: boolean;
}

export interface VisibleGraphResult {
  graphData: IGraphData | null;
  regexError: string | null;
}
