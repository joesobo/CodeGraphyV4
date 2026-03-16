import type { IGraphEdge, IPluginStatus } from '../../shared/types';
import { UNATTRIBUTED_RULE_KEY, type ExportRule } from './types';
import {
  buildRulesRecord,
  resolveRuleKeys as resolveRuleKeysHelper,
  type RuleMeta,
} from './jsonRuleHelpers';

export interface ExportRuleLookups {
  ruleMetaByQualified: Record<string, RuleMeta>;
  qualifiedByRuleId: Map<string, string[]>;
}

export interface ExportConnectionData {
  importsMap: Map<string, Record<string, string[]>>;
  rulesRecord: Record<string, ExportRule>;
}

export const resolveRuleKeys = resolveRuleKeysHelper;

export function buildRuleLookups(pluginStatuses: IPluginStatus[] = []): ExportRuleLookups {
  const ruleMetaByQualified: Record<string, RuleMeta> = {};
  const qualifiedByRuleId = new Map<string, string[]>();

  for (const plugin of pluginStatuses) {
    for (const rule of plugin.rules) {
      ruleMetaByQualified[rule.qualifiedId] = {
        name: rule.name,
        plugin: plugin.name,
      };

      const qualifiedIds = qualifiedByRuleId.get(rule.id);
      if (qualifiedIds) {
        qualifiedIds.push(rule.qualifiedId);
      } else {
        qualifiedByRuleId.set(rule.id, [rule.qualifiedId]);
      }
    }
  }

  return {
    ruleMetaByQualified,
    qualifiedByRuleId,
  };
}

export function buildConnectionData(
  edges: IGraphEdge[],
  lookups: ExportRuleLookups,
): ExportConnectionData {
  const importsMap = new Map<string, Record<string, string[]>>();
  const ruleConnectionCounts = new Map<string, number>();

  for (const edge of edges) {
    const ruleKeys = resolveRuleKeys(edge, lookups.qualifiedByRuleId);
    let fileImports = importsMap.get(edge.from);

    if (!fileImports) {
      fileImports = {};
      importsMap.set(edge.from, fileImports);
    }

    for (const key of ruleKeys) {
      if (!fileImports[key]) {
        fileImports[key] = [];
      }

      fileImports[key].push(edge.to);

      if (key !== UNATTRIBUTED_RULE_KEY) {
        ruleConnectionCounts.set(key, (ruleConnectionCounts.get(key) ?? 0) + 1);
      }
    }
  }

  return {
    importsMap,
    rulesRecord: buildRulesRecord(ruleConnectionCounts, lookups.ruleMetaByQualified),
  };
}
