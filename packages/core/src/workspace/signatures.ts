import { createHash } from 'node:crypto';
import type { IPlugin } from '@codegraphy-dev/plugin-api';
import { WORKSPACE_ANALYSIS_CACHE_VERSION } from '../analysis/cache';
import type { CodeGraphyWorkspaceSettings } from './settings';
import type { CodeGraphyInstalledPluginRecord } from '../plugins/installedCache';
import { requiresSymbolAnalysisCacheTier } from '../analysis/fileAnalysis';
import { resolveSavedGraphScope } from './graphScopeSettings';

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

export function createCodeGraphyWorkspacePackageAwarePluginSignature(input: {
  runtimePlugins: ReadonlyArray<Pick<IPlugin, 'id' | 'version'>>;
  packagePlugins?: ReadonlyArray<Pick<CodeGraphyInstalledPluginRecord, 'package' | 'version'>>;
  missingPackagePlugins?: readonly string[];
}): string | null {
  const entries = [
    ...input.runtimePlugins.map(plugin => `${plugin.id}@${plugin.version}`),
    ...(input.packagePlugins ?? []).map(plugin => `npm:${plugin.package}@${plugin.version}`),
    ...(input.missingPackagePlugins ?? []).map(packageName => `npm:${packageName}@missing`),
  ];

  return entries.length > 0 ? entries.join('|') : null;
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
    symbolAnalysis: requiresSymbolAnalysisCacheTier(resolveSavedGraphScope(settings).nodes),
    plugins: settings.plugins.map(plugin => ({
      id: plugin.id,
      enabled: plugin.enabled,
      disabledFilterPatterns: plugin.disabledFilterPatterns ?? [],
      options: sortRecord(plugin.options),
    })),
  };

  return createHash('sha1')
    .update(JSON.stringify(stableSettings))
    .digest('hex');
}
