import {
  CODEGRAPHY_MARKDOWN_PLUGIN_ID,
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
} from '@codegraphy-dev/core';
import { looseStringArraySchema } from '../../../../../shared/values';
import { isPlainObject } from '../plainObject';

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

  const pluginsById = new Map<string, Record<string, unknown>>();
  for (const plugin of plugins) {
    const pluginId = String(plugin.id);
    pluginsById.delete(pluginId);
    pluginsById.set(pluginId, plugin);
  }
  normalized.plugins = [...pluginsById.values()];
}

function normalizePersistedPlugin(plugin: unknown): Record<string, unknown> | null {
  if (!isPlainObject(plugin)) {
    return null;
  }

  const id = readPluginId(plugin);
  const activation = readPluginActivation(plugin);
  if (id.length === 0 || activation === null) {
    return null;
  }

  const normalizedPlugin: Record<string, unknown> = {
    id,
    activation,
  };
  const disabledFilterPatterns = looseStringArraySchema.parse(plugin.disabledFilterPatterns);
  if (disabledFilterPatterns.length > 0) {
    normalizedPlugin.disabledFilterPatterns = Array.from(new Set(disabledFilterPatterns));
  }
  if (isPlainObject(plugin.options)) {
    normalizedPlugin.options = { ...plugin.options };
  }
  return normalizedPlugin;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readPluginId(plugin: Record<string, unknown>): string {
  const id = readString(plugin.id);
  if (id.length > 0) {
    return id;
  }

  const packageName = readString(plugin.package);
  return packageName === CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME
    ? CODEGRAPHY_MARKDOWN_PLUGIN_ID
    : packageName;
}

function readPluginActivation(
  plugin: Record<string, unknown>,
): 'inherit' | 'enabled' | 'disabled' | null {
  if (
    plugin.activation === 'inherit'
    || plugin.activation === 'enabled'
    || plugin.activation === 'disabled'
  ) {
    return plugin.activation;
  }

  if (typeof plugin.enabled === 'boolean') {
    return plugin.enabled ? 'enabled' : 'disabled';
  }

  return readString(plugin.package).length > 0 ? 'enabled' : null;
}
