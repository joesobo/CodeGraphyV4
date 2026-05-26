import type { CodeGraphyInstalledPluginRecord } from './installedCache';
import type { CodeGraphyWorkspacePluginSettings } from '../workspace/settings';

export function mergePluginOptions(
  record: CodeGraphyInstalledPluginRecord,
  settings: CodeGraphyWorkspacePluginSettings,
): Record<string, unknown> | undefined {
  const merged = {
    ...record.defaultOptions,
    ...settings.options,
  };

  return Object.keys(merged).length > 0 ? merged : undefined;
}
