import { isPlainObject } from '../plainObject';
import { createLegendRuleId } from './legendId';

function normalizePersistedLegendRules(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isPlainObject)
    .map((rule, index) => ({
      ...rule,
      id: typeof rule.id === 'string' && rule.id.length > 0
        ? rule.id
        : createLegendRuleId(rule, index),
    }));
}

export function normalizePersistedLegend(normalized: Record<string, unknown>): void {
  if ('legend' in normalized) {
    normalized.legend = normalizePersistedLegendRules(normalized.legend);
  }
}
