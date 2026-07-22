import { normalizePersistedFilterPatterns } from './persistedShape/filterPatterns';
import { normalizePersistedGraphControls } from './persistedShape/graphControls';
import { normalizePersistedLegend } from './persistedShape/legendRules';
import { normalizePersistedPluginData } from './persistedShape/pluginData';
import { normalizePersistedInterfaces } from './persistedShape/interfaces';
import { normalizePersistedPlugins } from './persistedShape/plugins';
import { normalizePersistedCssSnippets } from './persistedShape/cssSnippets';
import { pickTopLevelSettings } from './persistedShape/topLevel';

export function normalizePersistedSettingsShape(
  value: unknown,
): Record<string, unknown> {
  const normalized = pickTopLevelSettings(value);
  normalizePersistedCssSnippets(normalized);
  normalizePersistedPlugins(normalized);
  normalizePersistedInterfaces(normalized);
  normalizePersistedPluginData(normalized);
  normalizePersistedFilterPatterns(normalized);
  normalizePersistedLegend(normalized);
  normalizePersistedGraphControls(normalized);
  return normalized;
}
