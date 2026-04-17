import type { IGraphData } from '../../../shared/graph/contracts';
import type { IGroup } from '../../../shared/settings/groups';
import { applyEdgeLegendRules } from './rules/edgeRules';
import { applyNodeLegendRules, getOrderedActiveRules } from './rules/nodeRules';

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

  return {
    ...data,
    nodes: data.nodes.map((node) => applyNodeLegendRules(node, activeRules)),
    edges: data.edges.map((edge) => applyEdgeLegendRules(edge, activeRules)),
  };
}

export const applyGroupColors = applyLegendRules;
