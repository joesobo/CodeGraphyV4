import { createDefaultCodeGraphyWorkspaceSettings } from './settingsDefaults';
import type { CodeGraphyWorkspaceSettings } from './settingsContracts';
import { normalizePluginSettings } from './settingsPlugins';
import { isRecord, readStringArray } from './settingsValues';

export function normalizeCodeGraphyWorkspaceSettings(
  value: unknown,
): CodeGraphyWorkspaceSettings {
  const defaults = createDefaultCodeGraphyWorkspaceSettings();
  if (!isRecord(value)) {
    return defaults;
  }

  return {
    version: 1,
    maxFiles: typeof value.maxFiles === 'number' && Number.isFinite(value.maxFiles)
      ? value.maxFiles
      : defaults.maxFiles,
    include: readStringArray(value.include).length > 0
      ? readStringArray(value.include)
      : defaults.include,
    respectGitignore: typeof value.respectGitignore === 'boolean'
      ? value.respectGitignore
      : defaults.respectGitignore,
    showOrphans: typeof value.showOrphans === 'boolean'
      ? value.showOrphans
      : defaults.showOrphans,
    filterPatterns: [...new Set(readStringArray(value.filterPatterns))],
    disabledCustomFilterPatterns: [...new Set(readStringArray(value.disabledCustomFilterPatterns))],
    plugins: normalizePluginSettings(value.plugins),
  };
}
