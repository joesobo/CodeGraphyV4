import { createHash } from 'node:crypto';
import type { IPlugin } from '@codegraphy/plugin-api';
import { WORKSPACE_ANALYSIS_CACHE_VERSION } from '../analysis/cache';
import type { CodeGraphyWorkspaceSettings } from './settings';

function sortRecord(value: Record<string, unknown> | undefined): Array<[string, unknown]> {
  return Object.keys(value ?? {})
    .sort((left, right) => left.localeCompare(right))
    .map(key => [key, value?.[key]]);
}

export function createCodeGraphyWorkspacePluginSignature(
  plugins: ReadonlyArray<Pick<IPlugin, 'id' | 'version'>>,
): string | null {
  if (plugins.length === 0) {
    return null;
  }

  return plugins
    .map(plugin => `${plugin.id}@${plugin.version}`)
    .join('|');
}

export function createCodeGraphyWorkspaceSettingsSignature(
  settings: CodeGraphyWorkspaceSettings,
): string {
  const stableSettings = {
    analysisVersion: WORKSPACE_ANALYSIS_CACHE_VERSION,
    maxFiles: settings.maxFiles,
    include: settings.include,
    respectGitignore: settings.respectGitignore,
    showOrphans: settings.showOrphans,
    filterPatterns: settings.filterPatterns,
    disabledCustomFilterPatterns: settings.disabledCustomFilterPatterns,
    disabledPluginFilterPatterns: settings.disabledPluginFilterPatterns,
    plugins: settings.plugins.map(plugin => ({
      package: plugin.package,
      disabledFilterPatterns: plugin.disabledFilterPatterns ?? [],
      options: sortRecord(plugin.options),
    })),
  };

  return createHash('sha1')
    .update(JSON.stringify(stableSettings))
    .digest('hex');
}
