import { isPlainObject } from './plainObject';

const TOP_LEVEL_SETTINGS_KEYS = new Set([
  'version',
  'maxFiles',
  'include',
  'respectGitignore',
  'showOrphans',
  'pluginOrder',
  'disabledPlugins',
  'nodeColors',
  'nodeVisibility',
  'edgeVisibility',
  'favorites',
  'bidirectionalEdges',
  'legend',
  'filterPatterns',
  'showLabels',
  'directionMode',
  'directionColor',
  'particleSpeed',
  'particleSize',
  'depthMode',
  'depthLimit',
  'dagMode',
  'nodeSizeMode',
  'physics',
  'timeline',
]);

const PHYSICS_SETTINGS_KEYS = new Set([
  'repelForce',
  'linkDistance',
  'linkForce',
  'damping',
  'centerForce',
  'chargeRange',
]);

const TIMELINE_SETTINGS_KEYS = new Set([
  'maxCommits',
  'playbackSpeed',
]);

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

function pickObjectKeys(
  value: unknown,
  allowedKeys: ReadonlySet<string>,
): Record<string, unknown> | undefined {
  if (!isPlainObject(value)) {
    return undefined;
  }

  const picked: Record<string, unknown> = {};
  for (const [key, entryValue] of Object.entries(value)) {
    if (allowedKeys.has(key) && entryValue !== undefined) {
      picked[key] = entryValue;
    }
  }

  return picked;
}

function pickTopLevelSettings(value: Record<string, unknown>): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const [key, entryValue] of Object.entries(value)) {
    if (TOP_LEVEL_SETTINGS_KEYS.has(key) && entryValue !== undefined) {
      picked[key] = entryValue;
    }
  }

  const physics = pickObjectKeys(picked.physics, PHYSICS_SETTINGS_KEYS);
  if (physics) {
    picked.physics = physics;
  }

  const timeline = pickObjectKeys(picked.timeline, TIMELINE_SETTINGS_KEYS);
  if (timeline) {
    picked.timeline = timeline;
  }

  return picked;
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
  if (!('filterPatterns' in normalized)) {
    return;
  }

  const filterPatterns = readStringArray(normalized.filterPatterns);
  normalized.filterPatterns = Array.from(new Set(filterPatterns));
}

function normalizePersistedLegend(normalized: Record<string, unknown>): void {
  if ('legend' in normalized) {
    normalized.legend = normalizePersistedLegendRules(normalized.legend);
  }
}

export function normalizePersistedSettingsShape(
  value: unknown,
): Record<string, unknown> {
  if (!isPlainObject(value)) {
    return {};
  }

  const normalized = pickTopLevelSettings(value);
  normalizePersistedFilterPatterns(normalized);
  normalizePersistedLegend(normalized);
  return normalized;
}
