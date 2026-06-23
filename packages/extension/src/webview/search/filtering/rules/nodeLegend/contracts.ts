import type { IGraphData } from '../../../../../shared/graph/contracts';
import type { IGroup } from '../../../../../shared/settings/groups';

export type GraphNode = IGraphData['nodes'][number];
export type GraphNodeSymbol = GraphNode['symbol'];

export interface CompiledNodeLegendRule {
  caseInsensitivePatternMatches: (value: string) => boolean;
  hasConstraints: boolean;
  patternMatches: (value: string) => boolean;
  patternHasPathSeparator: boolean;
  rule: IGroup;
  symbolFilePathMatches?: (value: string) => boolean;
}

export type NodeLegendRuleInput = IGroup | CompiledNodeLegendRule;
