import { execFileSync } from 'node:child_process';
import {
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  createCodeGraphyWorkspacePackageAwarePluginSignature,
  createCodeGraphyWorkspaceSettingsSignature,
  normalizeCodeGraphyWorkspaceSettings,
  readCodeGraphyInstalledPluginCache,
  type CodeGraphyInstalledPluginRecord,
  type CodeGraphyWorkspacePluginSettings,
} from '@codegraphy/core';
import type { Configuration } from '../../../config/reader';
import { execGitCommand } from '../../../gitHistory/exec';

export function createWorkspacePipelinePluginSignature(
  plugins: ReadonlyArray<{
    plugin: { id: string; version: string };
    builtIn?: boolean;
    sourcePackage?: string;
  }>,
  options: {
    installedPlugins?: ReadonlyArray<Pick<CodeGraphyInstalledPluginRecord, 'package' | 'version'>>;
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
  const loadedPackageNames = new Set(packagePlugins.map(plugin => plugin.package));
  const missingPackagePlugins = (options.settings?.plugins ?? [])
    .map(plugin => plugin.package)
    .filter(packageName => packageName !== CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME)
    .filter(packageName => !loadedPackageNames.has(packageName));

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
): string {
  return createCodeGraphyWorkspaceSettingsSignature(
    normalizeCodeGraphyWorkspaceSettings(config.getAll()),
  );
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
