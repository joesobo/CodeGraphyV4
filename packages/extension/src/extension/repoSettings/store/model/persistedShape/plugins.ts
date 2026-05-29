import { isPlainObject } from '../plainObject';
import { readStringArray } from './stringArray';

export function normalizePersistedPlugins(normalized: Record<string, unknown>): void {
  if (!Array.isArray(normalized.plugins)) {
    delete normalized.plugins;
    return;
  }

  if (normalized.plugins.length === 0) {
    normalized.plugins = [];
    return;
  }

  const plugins = normalized.plugins
    .map(normalizePersistedPlugin)
    .filter((plugin): plugin is Record<string, unknown> => plugin !== null);

  if (plugins.length === 0) {
    delete normalized.plugins;
    return;
  }

  normalized.plugins = plugins;
}

function normalizePersistedPlugin(plugin: unknown): Record<string, unknown> | null {
  if (!isPlainObject(plugin)) {
    return null;
  }

  const packageName = typeof plugin.package === 'string' ? plugin.package.trim() : '';
  if (packageName.length === 0) {
    return null;
  }

  const normalizedPlugin: Record<string, unknown> = {
    package: packageName,
  };
  const disabledFilterPatterns = readStringArray(plugin.disabledFilterPatterns);
  if (disabledFilterPatterns.length > 0) {
    normalizedPlugin.disabledFilterPatterns = Array.from(new Set(disabledFilterPatterns));
  }
  if (isPlainObject(plugin.options)) {
    normalizedPlugin.options = { ...plugin.options };
  }
  return normalizedPlugin;
}
