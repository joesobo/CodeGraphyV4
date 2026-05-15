import { isPlainObject } from './plainObject';
import { normalizeGraphLayoutSettings } from '../../graphLayout/model';
import { pruneGraphControlConfigMap, type GraphControlConfigKey } from '../../../../shared/graphControls/settings';

const TOP_LEVEL_SETTINGS_KEYS = new Set([
  'version',
  'maxFiles',
  'include',
  'respectGitignore',
  'showOrphans',
  'pluginOrder',
  'disabledPlugins',
  'plugins',
  'nodeColors',
  'nodeVisibility',
  'edgeVisibility',
  'favorites',
  'bidirectionalEdges',
  'legend',
  'legendVisibility',
  'legendOrder',
  'filterPatterns',
  'disabledCustomFilterPatterns',
  'disabledPluginFilterPatterns',
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
  'graphLayout',
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

function normalizePersistedPlugins(normalized: Record<string, unknown>): void {
  if (!('plugins' in normalized)) {
    return;
  }

  if (!Array.isArray(normalized.plugins)) {
    delete normalized.plugins;
    return;
  }

  if (normalized.plugins.length === 0) {
    normalized.plugins = [];
    return;
  }

  const plugins = normalized.plugins
    .filter(isPlainObject)
    .map((plugin) => {
      const packageName = typeof plugin.package === 'string' ? plugin.package.trim() : '';
      if (packageName.length === 0) {
        return null;
      }

      const normalizedPlugin: Record<string, unknown> = {
        package: packageName,
      };
      if (Array.isArray(plugin.disabledFilterPatterns)) {
        const disabledFilterPatterns = readStringArray(plugin.disabledFilterPatterns);
        if (disabledFilterPatterns.length > 0) {
          normalizedPlugin.disabledFilterPatterns = Array.from(new Set(disabledFilterPatterns));
        }
      }
      if (isPlainObject(plugin.options)) {
        normalizedPlugin.options = { ...plugin.options };
      }
      return normalizedPlugin;
    })
    .filter((plugin): plugin is Record<string, unknown> => plugin !== null);

  if (plugins.length === 0) {
    delete normalized.plugins;
    return;
  }

  normalized.plugins = plugins;
}

function normalizePersistedLegend(normalized: Record<string, unknown>): void {
  if ('legend' in normalized) {
    normalized.legend = normalizePersistedLegendRules(normalized.legend);
  }
}

function normalizePersistedGraphLayout(normalized: Record<string, unknown>): void {
  if ('graphLayout' in normalized) {
    normalized.graphLayout = normalizeGraphLayoutSettings(normalized.graphLayout);
  }
}

function normalizeGraphControlConfigMap(
  normalized: Record<string, unknown>,
  key: GraphControlConfigKey,
): void {
  const value = normalized[key];
  if (!isPlainObject(value)) {
    return;
  }

  normalized[key] = pruneGraphControlConfigMap(key, value as Record<string, boolean | string>);
}

function normalizePersistedGraphControls(normalized: Record<string, unknown>): void {
  normalizeGraphControlConfigMap(normalized, 'nodeVisibility');
  normalizeGraphControlConfigMap(normalized, 'nodeColors');
}

export function normalizePersistedSettingsShape(
  value: unknown,
): Record<string, unknown> {
  if (!isPlainObject(value)) {
    return {};
  }

  const normalized = pickTopLevelSettings(value);
  normalizePersistedPlugins(normalized);
  normalizePersistedFilterPatterns(normalized);
  normalizePersistedLegend(normalized);
  normalizePersistedGraphLayout(normalized);
  normalizePersistedGraphControls(normalized);
  return normalized;
}
