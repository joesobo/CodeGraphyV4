import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';
import {
  CODEGRAPHY_MARKDOWN_PLUGIN_ID,
  createCodeGraphyWorkspacePackageAwarePluginSignature,
  createCodeGraphyWorkspaceSettingsSignature,
  normalizeCodeGraphyWorkspaceSettings,
  readCodeGraphyInstalledPluginCache,
  type CodeGraphyInstalledPluginRecord,
  type CodeGraphyWorkspacePluginSettings,
} from '@codegraphy-dev/core';
import type { Configuration } from '../../../config/reader';

const execFileAsync = promisify(execFile);

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
): string {
  return createCodeGraphyWorkspaceSettingsSignature(
    normalizeCodeGraphyWorkspaceSettings(config.getAll()),
  );
}

export async function readWorkspacePipelineCurrentCommitSha(
  workspaceRoot: string,
): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
      cwd: workspaceRoot,
      encoding: 'utf8',
    });
    return stdout.trim();
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
