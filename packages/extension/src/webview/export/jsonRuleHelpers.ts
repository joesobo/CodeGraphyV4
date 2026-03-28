import type { IGraphEdge } from '../../shared/contracts';
import { UNATTRIBUTED_RULE_KEY, type ExportRule } from './types';

export interface RuleMeta {
  name: string;
  plugin: string;
}

export function resolveRuleKeys(
  edge: Pick<IGraphEdge, 'ruleIds' | 'ruleId'>,
  qualifiedByRuleId: Map<string, string[]>,
): string[] {
  if (Array.isArray(edge.ruleIds) && edge.ruleIds.length > 0) {
    return edge.ruleIds;
  }

  if (edge.ruleId) {
    const qualified = qualifiedByRuleId.get(edge.ruleId);
    if (qualified && qualified.length === 1) {
      return [qualified[0]];
    }

    return [edge.ruleId];
  }

  return [UNATTRIBUTED_RULE_KEY];
}

export function buildRulesRecord(
  ruleConnectionCounts: Map<string, number>,
  ruleMetaByQualified: Record<string, RuleMeta>,
): Record<string, ExportRule> {
  const rulesRecord: Record<string, ExportRule> = {};

  for (const key of Array.from(ruleConnectionCounts.keys()).sort()) {
    rulesRecord[key] = createExportRule(
      key,
      ruleConnectionCounts.get(key) ?? 0,
      ruleMetaByQualified[key],
    );
  }

  return rulesRecord;
}

function createExportRule(
  key: string,
  connections: number,
  meta?: RuleMeta,
): ExportRule {
  const resolvedMeta = meta ?? getFallbackRuleMeta(key);

  return {
    name: resolvedMeta.name,
    plugin: resolvedMeta.plugin,
    connections,
  };
}

function getFallbackRuleMeta(key: string): RuleMeta {
  const [plugin, ...nameParts] = key.split(':');

  if (nameParts.length === 0) {
    return {
      name: key,
      plugin: 'unknown',
    };
  }

  return {
    name: nameParts.join(':'),
    plugin,
  };
}
