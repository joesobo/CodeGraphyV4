import {
  importCodeGraphyPluginPackageModule,
  resolveCodeGraphyWorkspacePluginRecords,
  type CodeGraphyInstalledPluginRecord,
  type CodeGraphyWorkspaceSettings,
} from '@codegraphy-dev/core';
import type {
  IExtensionPlugin,
  IExtensionPluginFactory,
} from '@codegraphy-dev/extension-plugin-api';
import {
  assertExtensionPluginDescriptorApiCompatibility,
  type ExtensionPluginRegistry,
} from '../../../plugins/registry';
import type { WorkspacePackagePluginRegistrationDependencies } from './packages';
import { createWorkspacePluginRuntimeSignature } from './signature';

const EXTENSION_PLUGIN_HOST = 'codegraphy.extension';

export interface WorkspaceExtensionPluginRegistration {
  plugin: IExtensionPlugin;
  options: {
    builtIn?: boolean;
    sourcePackage: string;
    sourcePackageRoot: string;
    descriptorSignature: string;
  };
}

function readFactory(moduleNamespace: unknown, packageName: string): IExtensionPluginFactory {
  if (
    typeof moduleNamespace !== 'object'
    || moduleNamespace === null
    || !('default' in moduleNamespace)
    || typeof moduleNamespace.default !== 'function'
  ) {
    throw new Error(`Package '${packageName}' must export a default Extension plugin factory.`);
  }
  return moduleNamespace.default as IExtensionPluginFactory;
}

function validatePlugin(plugin: IExtensionPlugin, record: CodeGraphyInstalledPluginRecord): void {
  if (plugin.id !== record.id) {
    throw new Error(
      `Package '${record.package}' exported plugin id '${plugin.id}', `
      + `but its package manifest declares '${record.id}'.`,
    );
  }
}

async function loadExtensionPlugin(
  record: CodeGraphyInstalledPluginRecord,
): Promise<{ buildIdentity: string; plugin: IExtensionPlugin }> {
  assertExtensionPluginDescriptorApiCompatibility(record.id, record.apiVersion);
  const { buildIdentity, moduleNamespace } = await importCodeGraphyPluginPackageModule(record);
  const plugin = await readFactory(moduleNamespace, record.package)();
  validatePlugin(plugin, record);
  return { buildIdentity, plugin };
}

export async function loadWorkspaceExtensionPluginRegistrations(
  settings: CodeGraphyWorkspaceSettings,
  workspaceRoot: string,
  dependencies: WorkspacePackagePluginRegistrationDependencies,
): Promise<WorkspaceExtensionPluginRegistration[]> {
  const warn = dependencies.warn ?? console.warn;
  const disabledPluginIds = new Set(dependencies.disabledPlugins ?? []);
  const resolved = await resolveCodeGraphyWorkspacePluginRecords({
    bundledPackageRoots: dependencies.bundledPluginPackageRoots,
    disabledPlugins: dependencies.disabledPlugins,
    settings,
    workspaceRoot,
    homeDir: dependencies.userHomeDir,
    warn,
  });
  const registrations: WorkspaceExtensionPluginRegistration[] = [];

  for (const record of resolved.records) {
    if (record.host !== EXTENSION_PLUGIN_HOST || disabledPluginIds.has(record.id)) continue;

    try {
      const { buildIdentity, plugin } = await loadExtensionPlugin(record);
      registrations.push({
        plugin,
        options: {
          ...(resolved.bundledPackageRoots.has(record.packageRoot) ? { builtIn: true } : {}),
          sourcePackage: record.package,
          sourcePackageRoot: record.packageRoot,
          descriptorSignature: createWorkspacePluginRuntimeSignature(
            record,
            plugin,
            buildIdentity,
          ),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warn(`CodeGraphy Extension plugin '${record.id}' could not be loaded: ${message}`);
    }
  }

  return registrations;
}

export async function registerWorkspaceExtensionPlugins(
  registry: ExtensionPluginRegistry,
  settings: CodeGraphyWorkspaceSettings,
  workspaceRoot: string,
  dependencies: WorkspacePackagePluginRegistrationDependencies,
): Promise<void> {
  const registrations = await loadWorkspaceExtensionPluginRegistrations(
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
      warn(`CodeGraphy Extension plugin '${registration.plugin.id}' could not be registered: ${message}`);
    }
  }
}
