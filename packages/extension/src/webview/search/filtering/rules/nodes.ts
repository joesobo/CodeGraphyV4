import type { IGraphData } from '../../../../shared/graph/contracts';
import type { IGroup } from '../../../../shared/settings/groups';
import {
  applyCompiledNodeLegendRules as applyCompiledNodeLegendRulesImpl,
  applyNodeLegendRules as applyNodeLegendRulesImpl,
} from './nodeLegend/apply';
import {
  compileNodeLegendRules as compileNodeLegendRulesImpl,
  getOrderedActiveRules as getOrderedActiveRulesImpl,
} from './nodeLegend/compile';
import type {
  CompiledNodeLegendRule,
  NodeLegendRuleInput,
} from './nodeLegend/contracts';

export type { CompiledNodeLegendRule } from './nodeLegend/contracts';

export function getOrderedActiveRules(legends: IGroup[]): IGroup[] {
  return getOrderedActiveRulesImpl(legends);
}

export function compileNodeLegendRules(activeRules: IGroup[]): CompiledNodeLegendRule[] {
  return compileNodeLegendRulesImpl(activeRules);
}

export function applyCompiledNodeLegendRules(
  node: IGraphData['nodes'][number],
  activeRules: readonly CompiledNodeLegendRule[],
): IGraphData['nodes'][number] {
  return applyCompiledNodeLegendRulesImpl(node, activeRules);
}

export function applyNodeLegendRules(
  node: IGraphData['nodes'][number],
  activeRules: readonly NodeLegendRuleInput[],
): IGraphData['nodes'][number] {
  return applyNodeLegendRulesImpl(node, activeRules);
}
