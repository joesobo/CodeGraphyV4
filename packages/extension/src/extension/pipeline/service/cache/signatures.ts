import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  CODEGRAPHY_MARKDOWN_PLUGIN_ID,
  createCodeGraphyWorkspacePackageAwarePluginSignature,
  createCodeGraphyWorkspaceSettingsSignature,
  normalizeCodeGraphyWorkspaceSettings,
  readCodeGraphyInstalledPluginCache,
  type CodeGraphyInstalledPluginRecord,
  type CodeGraphyWorkspacePluginSettings,
  type IFilesExcludeRule,
} from '@codegraphy-dev/core';
import type { Configuration } from '../../../config/reader';
import { execGitCommand } from '../../../gitHistory/exec';

export function createWorkspacePipelinePluginSignature(
  plugins: ReadonlyArray<{
    plugin: { id: string; version: string };
    builtIn?: boolean;
    sourcePackage?: string;
  }>,
  options: {
    installedPlugins?: ReadonlyArray<Pick<CodeGraphyInstalledPluginRecord, 'package' | 'version' | 'pluginId'>>;
    settings?: { plugins?: readonly CodeGraphyWorkspacePluginSettings[] };
  } = {},
): string | null {
  const installedRecordsByPackage = new Map(
    (options.installedPlugins ?? readCodeGraphyInstalledPluginCache().plugins)
      .map(plugin => [plugin.package, plugin] as const),
  );
  const packagePlugins = plugins
    .filter(pluginInfo => !pluginInfo.builtIn && pluginInfo.sourcePackage)
    .map((pluginInfo) => {
      const sourcePackage = pluginInfo.sourcePackage as string;
      return installedRecordsByPackage.get(sourcePackage) ?? {
        package: sourcePackage,
        version: pluginInfo.plugin.version,
      };
    });
  const loadedPluginIds = new Set(packagePlugins.map(plugin => plugin.pluginId ?? plugin.package));
  const missingPackagePlugins = (options.settings?.plugins ?? [])
    .filter(plugin => plugin.enabled && plugin.id !== CODEGRAPHY_MARKDOWN_PLUGIN_ID)
    .map(plugin => plugin.id)
    .filter(pluginId => !loadedPluginIds.has(pluginId));

  return createCodeGraphyWorkspacePackageAwarePluginSignature({
    runtimePlugins: plugins
      .filter(pluginInfo => pluginInfo.builtIn || !pluginInfo.sourcePackage)
      .map(({ plugin }) => ({
        id: plugin.id,
        version: plugin.version,
      })),
    packagePlugins,
    missingPackagePlugins,
  });
}

export function createWorkspacePipelineSettingsSignature(
  config: Configuration,
  filesExclude: readonly IFilesExcludeRule[] = [],
): string {
  const settingsSignature = createCodeGraphyWorkspaceSettingsSignature(
    normalizeCodeGraphyWorkspaceSettings(config.getAll()),
  );
  const normalizedFilesExclude = [...filesExclude]
    .map(rule => ({ pattern: rule.pattern, ...(rule.when ? { when: rule.when } : {}) }))
    .sort((left, right) => (
      left.pattern.localeCompare(right.pattern)
      || (left.when ?? '').localeCompare(right.when ?? '')
    ));
  return createHash('sha1')
    .update(JSON.stringify({ settingsSignature, filesExclude: normalizedFilesExclude }))
    .digest('hex');
}

export async function readWorkspacePipelineCurrentCommitSha(
  workspaceRoot: string,
): Promise<string | null> {
  try {
    return (await execGitCommand(['rev-parse', 'HEAD'], { workspaceRoot })).trim();
  } catch {
    return null;
  }
}

export function readWorkspacePipelineCurrentCommitShaSync(
  workspaceRoot: string,
): string | null {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: workspaceRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}
