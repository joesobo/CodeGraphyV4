import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  loadCodeGraphyWorkspacePluginPackages,
  type CodeGraphyWorkspaceSettings,
} from '@codegraphy-dev/core';
import type { PluginRegistry } from '../../../../core/plugins/registry/manager';
import type { WorkspacePipelinePluginRegistration } from './builtIns';
import { createWorkspacePluginRuntimeSignature } from './signature';

export interface WorkspacePackagePluginRegistrationDependencies {
  bundledPluginPackageRoots?: Iterable<string>;
  disabledPlugins?: Iterable<string>;
  userHomeDir?: string;
  warn?: (message: string) => void;
}

function readPackageInterfaceData(packageRoot: string): Array<{ id: string; data: unknown }> {
  try {
    const data: unknown = JSON.parse(
      fs.readFileSync(path.join(packageRoot, 'codegraphy.extension.json'), 'utf8'),
    );
    return [{ id: 'codegraphy.extension', data }];
  } catch {
    return [];
  }
}

export async function loadWorkspacePackagePluginRegistrations(
  settings: CodeGraphyWorkspaceSettings,
  workspaceRoot: string,
  dependencies: WorkspacePackagePluginRegistrationDependencies,
): Promise<WorkspacePipelinePluginRegistration[]> {
  const warn = dependencies.warn ?? console.warn;
  const loadedPackagePlugins = await loadCodeGraphyWorkspacePluginPackages({
    bundledPackageRoots: dependencies.bundledPluginPackageRoots,
    disabledPlugins: dependencies.disabledPlugins,
    settings,
    workspaceRoot,
    homeDir: dependencies.userHomeDir,
    warn,
  });

  return loadedPackagePlugins.map(loadedPlugin => ({
    plugin: loadedPlugin.plugin,
    options: {
      ...(loadedPlugin.bundled ? { builtIn: true } : {}),
      sourcePackage: loadedPlugin.packageName,
      sourcePackageRoot: loadedPlugin.record.packageRoot,
      descriptorSignature: createWorkspacePluginRuntimeSignature(
        loadedPlugin.record,
        loadedPlugin.plugin,
      ),
      ...(loadedPlugin.options ? { options: loadedPlugin.options } : {}),
      interfaces: readPackageInterfaceData(loadedPlugin.record.packageRoot),
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
