import {
  importCodeGraphyPluginPackageModule,
  createWorkspacePluginDataHost,
  mergePluginOptions,
  resolveCodeGraphyWorkspacePluginRecordsForHost,
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
    options?: Record<string, unknown>;
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
  settings: CodeGraphyWorkspaceSettings['plugins'][number],
  workspaceRoot: string,
): Promise<{
  buildIdentity: string;
  options?: Record<string, unknown>;
  plugin: IExtensionPlugin;
}> {
  assertExtensionPluginDescriptorApiCompatibility(record.id, record.apiVersion);
  const { buildIdentity, moduleNamespace } = await importCodeGraphyPluginPackageModule(record);
  const options = mergePluginOptions(record, settings);
  const plugin = await readFactory(moduleNamespace, record.package)({
    dataHost: createWorkspacePluginDataHost(workspaceRoot, record.id),
    ...(options ? { options } : {}),
  });
  validatePlugin(plugin, record);
  return {
    buildIdentity,
    ...(options ? { options } : {}),
    plugin,
  };
}

export async function loadWorkspaceExtensionPluginRegistrations(
  settings: CodeGraphyWorkspaceSettings,
  workspaceRoot: string,
  dependencies: WorkspacePackagePluginRegistrationDependencies,
): Promise<WorkspaceExtensionPluginRegistration[]> {
  const warn = dependencies.warn ?? console.warn;
  const disabledPluginIds = new Set(dependencies.disabledPlugins ?? []);
  const settingsById = new Map(settings.plugins.map(plugin => [plugin.id, plugin] as const));
  const resolved = await resolveCodeGraphyWorkspacePluginRecordsForHost({
    bundledPackageRoots: dependencies.bundledPluginPackageRoots,
    disabledPlugins: dependencies.disabledPlugins,
    settings,
    workspaceRoot,
    homeDir: dependencies.userHomeDir,
    warn,
  }, EXTENSION_PLUGIN_HOST);
  const registrations: WorkspaceExtensionPluginRegistration[] = [];

  for (const record of resolved.records) {
    if (disabledPluginIds.has(record.id)) continue;

    try {
      const pluginSettings = settingsById.get(record.id) ?? {
        id: record.id,
        activation: 'inherit' as const,
      };
      const { buildIdentity, options, plugin } = await loadExtensionPlugin(
        record,
        pluginSettings,
        workspaceRoot,
      );
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
          ...(options ? { options } : {}),
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
