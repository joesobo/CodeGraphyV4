import { readCodeGraphyInstalledPluginCache } from './installedCache';
import { loadCodeGraphyWorkspacePluginPackage } from './packageLoad';
export type {
  LoadedCodeGraphyWorkspacePluginPackage,
  LoadCodeGraphyWorkspacePluginPackagesOptions,
} from './packageRuntimeContracts';
import type {
  LoadedCodeGraphyWorkspacePluginPackage,
  LoadCodeGraphyWorkspacePluginPackagesOptions,
} from './packageRuntimeContracts';
import {
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  type CodeGraphyWorkspacePluginSettings,
} from '../workspace/settings';

function shouldLoadPackagePlugin(settings: CodeGraphyWorkspacePluginSettings): boolean {
  return settings.package !== CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME;
}

export async function loadCodeGraphyWorkspacePluginPackages(
  options: LoadCodeGraphyWorkspacePluginPackagesOptions,
): Promise<LoadedCodeGraphyWorkspacePluginPackage[]> {
  const warn = options.warn ?? (() => undefined);
  const recordsByPackage = new Map(
    readCodeGraphyInstalledPluginCache({ homeDir: options.homeDir })
      .plugins
      .map(record => [record.package, record] as const),
  );
  const loaded: LoadedCodeGraphyWorkspacePluginPackage[] = [];

  for (const pluginSettings of options.settings.plugins.filter(shouldLoadPackagePlugin)) {
    const record = recordsByPackage.get(pluginSettings.package);
    if (!record) {
      warn(`CodeGraphy plugin package '${pluginSettings.package}' is enabled but not installed.`);
      continue;
    }

    try {
      loaded.push(await loadCodeGraphyWorkspacePluginPackage(pluginSettings, record));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warn(`CodeGraphy plugin package '${pluginSettings.package}' could not be loaded: ${message}`);
    }
  }

  return loaded;
}
