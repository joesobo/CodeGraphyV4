import type { SearchOptions } from '../components/searchBar/field/model';
import { globMatch } from '../globMatch';
import { filterNodesAdvanced } from './matching';
import { DEFAULT_NODE_COLOR } from '../../shared/fileColors';
import type { IGraphData } from '../../shared/graph/types';
import type { IGroup } from '../../shared/settings/groups';

export { filterNodesAdvanced } from './matching';

function getOrderedActiveRules(groups: IGroup[]): IGroup[] {
  return groups
    .filter((group) => !group.disabled)
    .slice()
    .reverse();
}

function ruleTargetsNodes(rule: IGroup): boolean {
  return (rule.target ?? 'node') !== 'edge';
}

function ruleTargetsEdges(rule: IGroup): boolean {
  return (rule.target ?? 'node') !== 'node';
}

function matchesEdgeRule(
  edge: IGraphData['edges'][number],
  rule: IGroup,
): boolean {
  return (
    globMatch(edge.id, rule.pattern)
    || globMatch(edge.kind, rule.pattern)
    || globMatch(`${edge.from}->${edge.to}`, rule.pattern)
    || globMatch(`${edge.from}->${edge.to}#${edge.kind}`, rule.pattern)
  );
}

export function filterGraphData(
  graphData: IGraphData | null,
  searchQuery: string,
  searchOptions: SearchOptions,
): { filteredData: IGraphData | null; regexError: string | null } {
  if (!graphData) {
    return { filteredData: null, regexError: null };
  }

  if (!searchQuery.trim()) {
    return { filteredData: graphData, regexError: null };
  }

  const result = filterNodesAdvanced(graphData.nodes, searchQuery, searchOptions);
  const filteredNodes = graphData.nodes.filter((node) => result.matchingIds.has(node.id));
  const filteredEdges = graphData.edges.filter(
    (edge) => result.matchingIds.has(edge.from) && result.matchingIds.has(edge.to),
  );

  return {
    filteredData: { nodes: filteredNodes, edges: filteredEdges },
    regexError: result.regexError,
  };
}

export function applyLegendRules(
  data: IGraphData | null,
  groups: IGroup[],
): IGraphData | null {
  if (!data) {
    return null;
  }

  if (groups.length === 0) {
    return data;
  }

  const activeRules = getOrderedActiveRules(groups);

  return {
    ...data,
    nodes: data.nodes.map((node) => {
      const nextNode = {
        ...node,
        color: node.color || DEFAULT_NODE_COLOR,
      };

      for (const rule of activeRules) {
        if (!ruleTargetsNodes(rule) || !globMatch(node.id, rule.pattern)) {
          continue;
        }

        nextNode.color = rule.color;
        if (rule.shape2D) {
          nextNode.shape2D = rule.shape2D;
        }
        if (rule.shape3D) {
          nextNode.shape3D = rule.shape3D;
        }
        if (rule.imageUrl) {
          nextNode.imageUrl = rule.imageUrl;
        }
      }

      return nextNode;
    }),
    edges: data.edges.map((edge) => {
      const nextEdge = { ...edge };

      for (const rule of activeRules) {
        if (!ruleTargetsEdges(rule) || !matchesEdgeRule(edge, rule)) {
          continue;
        }

        nextEdge.color = rule.color;
      }

      return nextEdge;
    }),
  };
}

export const applyGroupColors = applyLegendRules;
