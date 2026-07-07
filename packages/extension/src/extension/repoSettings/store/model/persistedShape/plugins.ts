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

  normalized.plugins = plugins;
}

function normalizePersistedPlugin(plugin: unknown): Record<string, unknown> | null {
  if (!isPlainObject(plugin)) {
    return null;
  }

  const id = readPluginId(plugin);
  const enabled = readPluginEnabled(plugin);
  if (id.length === 0 || enabled === null) {
    return null;
  }

  const normalizedPlugin: Record<string, unknown> = {
    id,
    enabled,
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

function readPluginEnabled(plugin: Record<string, unknown>): boolean | null {
  if (typeof plugin.enabled === 'boolean') {
    return plugin.enabled;
  }

  return readString(plugin.package).length > 0 ? true : null;
}
