import { normalizePersistedFilterPatterns } from './persistedShape/filterPatterns';
import { normalizePersistedGraphControls } from './persistedShape/graphControls';
import { normalizePersistedLegend } from './persistedShape/legendRules';
import { normalizePersistedPluginData } from './persistedShape/pluginData';
import { normalizePersistedPlugins } from './persistedShape/plugins';
import { pickTopLevelSettings } from './persistedShape/topLevel';

export function normalizePersistedSettingsShape(
  value: unknown,
): Record<string, unknown> {
  const normalized = pickTopLevelSettings(value);
  normalizePersistedPlugins(normalized);
  normalizePersistedPluginData(normalized);
  normalizePersistedFilterPatterns(normalized);
  normalizePersistedLegend(normalized);
  normalizePersistedGraphControls(normalized);
  return normalized;
}
