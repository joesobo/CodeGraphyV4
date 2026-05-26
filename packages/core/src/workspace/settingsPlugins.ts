import type { CodeGraphyWorkspacePluginSettings } from './settingsContracts';
import { isRecord, readOptions, readStringArray } from './settingsValues';

export function normalizePluginSettings(value: unknown): CodeGraphyWorkspacePluginSettings[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((entry): CodeGraphyWorkspacePluginSettings | null => {
      const packageName = typeof entry.package === 'string' ? entry.package.trim() : '';
      if (packageName.length === 0) {
        return null;
      }

      const plugin: CodeGraphyWorkspacePluginSettings = {
        package: packageName,
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
