import type { IGraphData } from '../../../shared/graph/contracts';
import type { IGroup } from '../../../shared/settings/groups';
import { applyCompiledEdgeLegendRules, compileEdgeLegendRules } from './rules/edges';
import { applyCompiledNodeLegendRules, compileNodeLegendRules, getOrderedActiveRules } from './rules/nodes';

export function applyLegendRules(
  data: IGraphData | null,
  legends: IGroup[],
): IGraphData | null {
  if (!data) {
    return null;
  }

  if (legends.length === 0) {
    return data;
  }

  const activeRules = getOrderedActiveRules(legends);
  const nodeRules = compileNodeLegendRules(activeRules);
  const edgeRules = compileEdgeLegendRules(activeRules);

  return {
    ...data,
    nodes: data.nodes.map((node) => applyCompiledNodeLegendRules(node, nodeRules)),
    edges: data.edges.map((edge) => applyCompiledEdgeLegendRules(edge, edgeRules)),
  };
}

export const applyGroupColors = applyLegendRules;
