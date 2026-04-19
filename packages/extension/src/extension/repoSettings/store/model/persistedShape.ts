import { isPlainObject } from './plainObject';

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

function createLegendRuleId(rule: Record<string, unknown>, index: number): string {
  const target = typeof rule.target === 'string' && rule.target.length > 0
    ? rule.target
    : 'node';
  const pattern = typeof rule.pattern === 'string' && rule.pattern.length > 0
    ? rule.pattern
    : `rule-${index + 1}`;
  const slug = pattern
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || `rule-${index + 1}`;

  return `legend:${target}:${slug}:${index + 1}`;
}

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

function normalizePersistedFilterPatterns(normalized: Record<string, unknown>): void {
  const filterPatterns = readStringArray(normalized.filterPatterns);
  if (filterPatterns.length > 0) {
    normalized.filterPatterns = Array.from(new Set(filterPatterns));
  }

  delete normalized.exclude;
}

function normalizePersistedLegend(normalized: Record<string, unknown>): void {
  if (Array.isArray(normalized.legend) && normalized.legend.length > 0) {
    normalized.legend = normalizePersistedLegendRules(normalized.legend);
    return;
  }

  if (
    Array.isArray(normalized.groups)
    && (!Array.isArray(normalized.legend) || normalized.legend.length === 0)
  ) {
    normalized.legend = normalizePersistedLegendRules(normalized.groups);
  }
}

function normalizePersistedNodeColors(normalized: Record<string, unknown>): void {
  const nodeColors = isPlainObject(normalized.nodeColors)
    ? { ...normalized.nodeColors }
    : {};
  if (typeof normalized.folderNodeColor === 'string' && !('folder' in nodeColors)) {
    nodeColors.folder = normalized.folderNodeColor;
  }
  if (Object.keys(nodeColors).length > 0) {
    normalized.nodeColors = nodeColors;
  }
}

export function normalizePersistedSettingsShape(
  value: unknown,
): Record<string, unknown> {
  if (!isPlainObject(value)) {
    return {};
  }

  const normalized: Record<string, unknown> = { ...value };
  normalizePersistedFilterPatterns(normalized);
  normalizePersistedLegend(normalized);
  normalizePersistedNodeColors(normalized);
  return normalized;
}
