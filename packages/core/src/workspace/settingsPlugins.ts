import type { CodeGraphyWorkspacePluginSettings } from './settingsContracts';
import {
  CODEGRAPHY_MARKDOWN_PLUGIN_ID,
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
} from './settingsDefaults';
import { isRecord, readOptions, readStringArray } from './settingsValues';

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readPluginId(entry: Record<string, unknown>): string {
  const id = readString(entry.id);
  if (id.length > 0) {
    return id;
  }

  const packageName = readString(entry.package);
  if (packageName === CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME) {
    return CODEGRAPHY_MARKDOWN_PLUGIN_ID;
  }

  return packageName;
}

function readPluginEnabled(entry: Record<string, unknown>): boolean | null {
  if (typeof entry.enabled === 'boolean') {
    return entry.enabled;
  }

  return readString(entry.package).length > 0 ? true : null;
}

export function normalizePluginSettings(value: unknown): CodeGraphyWorkspacePluginSettings[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((entry): CodeGraphyWorkspacePluginSettings | null => {
      const id = readPluginId(entry);
      const enabled = readPluginEnabled(entry);
      if (id.length === 0 || enabled === null) {
        return null;
      }

      const plugin: CodeGraphyWorkspacePluginSettings = {
        id,
        enabled,
      };
      const disabledFilterPatterns = readStringArray(entry.disabledFilterPatterns);
      if (disabledFilterPatterns.length > 0) {
        plugin.disabledFilterPatterns = [...new Set(disabledFilterPatterns)];
      }

      const options = readOptions(entry.options);
      if (options) {
        plugin.options = options;
      }

      return plugin;
    })
    .filter((entry): entry is CodeGraphyWorkspacePluginSettings => entry !== null);
}
