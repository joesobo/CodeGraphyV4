import { globMatch } from '../../../globMatch';
import type { IGraphData } from '../../../../shared/graph/contracts';
import type { IGroup } from '../../../../shared/settings/groups';

function globMatchCaseInsensitive(value: string, pattern: string): boolean {
  return globMatch(value.toLowerCase(), pattern.toLowerCase());
}

export function rulePatternMatchesNode(
  node: IGraphData['nodes'][number],
  rule: IGroup,
): boolean {
  if (globMatch(node.id, rule.pattern)) {
    return true;
  }

  if (rule.isPluginDefault) {
    return false;
  }

  const symbol = node.symbol;
  const candidates = [
    node.label,
    symbol?.name,
    symbol?.kind,
    symbol?.pluginKind,
    symbol?.filePath,
  ].filter((candidate): candidate is string => Boolean(candidate));

  return candidates.some((candidate) => globMatchCaseInsensitive(candidate, rule.pattern));
}
