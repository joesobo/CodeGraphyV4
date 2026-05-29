import {
  loadCodeGraphyWorkspacePluginPackages,
  type CodeGraphyWorkspaceSettings,
} from '@codegraphy-dev/core';
import type { PluginRegistry } from '../../../../core/plugins/registry/manager';

export interface WorkspacePackagePluginRegistrationDependencies {
  userHomeDir?: string;
  warn?: (message: string) => void;
}

export async function registerWorkspacePackagePlugins(
  registry: PluginRegistry,
  settings: CodeGraphyWorkspaceSettings,
  workspaceRoot: string,
  dependencies: WorkspacePackagePluginRegistrationDependencies,
): Promise<void> {
  const loadedPackagePlugins = await loadCodeGraphyWorkspacePluginPackages({
    settings,
    workspaceRoot,
    homeDir: dependencies.userHomeDir,
    warn: dependencies.warn,
  });

  for (const loadedPlugin of loadedPackagePlugins) {
    registry.register(loadedPlugin.plugin, {
      sourcePackage: loadedPlugin.packageName,
      sourcePackageRoot: loadedPlugin.record.packageRoot,
      ...(loadedPlugin.options ? { options: loadedPlugin.options } : {}),
    });
  }
}
