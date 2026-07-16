import {
  loadCodeGraphyWorkspacePluginPackages,
  type CodeGraphyWorkspaceSettings,
} from '@codegraphy-dev/core';
import type { PluginRegistry } from '../../../../core/plugins/registry/manager';
import type { WorkspacePipelinePluginRegistration } from './builtIns';

export interface WorkspacePackagePluginRegistrationDependencies {
  bundledPluginPackageRoots?: Iterable<string>;
  disabledPlugins?: Iterable<string>;
  userHomeDir?: string;
  warn?: (message: string) => void;
}

export async function loadWorkspacePackagePluginRegistrations(
  settings: CodeGraphyWorkspaceSettings,
  workspaceRoot: string,
  dependencies: WorkspacePackagePluginRegistrationDependencies,
): Promise<WorkspacePipelinePluginRegistration[]> {
  const loadedPackagePlugins = await loadCodeGraphyWorkspacePluginPackages({
    bundledPackageRoots: dependencies.bundledPluginPackageRoots,
    disabledPlugins: dependencies.disabledPlugins,
    settings,
    workspaceRoot,
    homeDir: dependencies.userHomeDir,
    warn: dependencies.warn,
  });

  return loadedPackagePlugins.map(loadedPlugin => ({
    plugin: loadedPlugin.plugin,
    options: {
      ...(loadedPlugin.bundled ? { builtIn: true } : {}),
      sourcePackage: loadedPlugin.packageName,
      sourcePackageRoot: loadedPlugin.record.packageRoot,
      ...(loadedPlugin.options ? { options: loadedPlugin.options } : {}),
    },
  }));
}

export async function registerWorkspacePackagePlugins(
  registry: PluginRegistry,
  settings: CodeGraphyWorkspaceSettings,
  workspaceRoot: string,
  dependencies: WorkspacePackagePluginRegistrationDependencies,
): Promise<void> {
  const registrations = await loadWorkspacePackagePluginRegistrations(
    settings,
    workspaceRoot,
    dependencies,
  );

  const warn = dependencies.warn ?? console.warn;
  for (const registration of registrations) {
    try {
      registry.register(registration.plugin, registration.options);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warn(`CodeGraphy plugin '${registration.plugin.id}' could not be registered: ${message}`);
    }
  }
}
