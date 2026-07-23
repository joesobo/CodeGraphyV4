import type { IGraphData } from '../../../../shared/graph/contracts';
import type { IGroup } from '../../../../shared/settings/groups';
import { getOrderedActiveRules } from '../../../search/filtering/rules/nodeLegend/compile';
import {
  ruleMatchesNode,
  ruleTargetsNodes,
} from '../../../search/filtering/rules/nodeMatcher';
import type { GraphTooltipState } from './state';

export function readTooltipSymbol(
  nodeId: string,
  snapshot: Pick<IGraphData, 'nodes'>,
  legends: readonly IGroup[] = [],
): GraphTooltipState['symbol'] {
  const node = snapshot.nodes.find((candidate) => candidate.id === nodeId);
  const symbol = node?.symbol;
  const pluginName = node
    ? getOrderedActiveRules([...legends]).find((rule) =>
        Boolean(rule.pluginId)
        && Boolean(rule.pluginName)
        && ruleTargetsNodes(rule)
        && ruleMatchesNode(node, rule),
      )?.pluginName
    : undefined;

  return symbol
    ? {
        name: symbol.name,
        kind: symbol.kind,
        filePath: symbol.filePath,
        ...(pluginName ? { plugin: pluginName } : {}),
      }
    : undefined;
}
