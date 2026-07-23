import {
  prepareCodeGraphyPluginPackageModule,
  createWorkspacePluginDataHost,
  mergePluginOptions,
  resolveCodeGraphyWorkspacePluginRecordsForHost,
  type CodeGraphyInstalledPluginRecord,
  type CodeGraphyWorkspaceSettings,
} from '@codegraphy-dev/core';
import type {
  IExtensionPlugin,
  IExtensionPluginDescriptorData,
  IExtensionPluginFactory,
} from '@codegraphy-dev/extension-plugin-api';
import {
  assertExtensionPluginDescriptorApiCompatibility,
  assertExtensionPluginApiCompatibility,
  type ExtensionPluginRegistry,
} from '../../../plugins/registry';
import type { WorkspacePackagePluginRegistrationDependencies } from './packages';
import { createWorkspacePluginDescriptorSignature } from './signature';
import { disposeRejectedPluginRuntime } from './registrationCleanup';

const EXTENSION_PLUGIN_HOST = 'codegraphy.extension';

export interface WorkspaceExtensionPluginRegistration {
  plugin: IExtensionPlugin;
  options: {
    builtIn?: boolean;
    sourcePackage: string;
    sourcePackageRoot: string;
    descriptorSignature: string;
    options?: Record<string, unknown>;
    data?: IExtensionPluginDescriptorData;
  };
}

export interface WorkspaceExtensionPluginCandidate {
  id: string;
  options: WorkspaceExtensionPluginRegistration['options'];
  load(): Promise<WorkspaceExtensionPluginRegistration>;
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

function readExtensionDescriptorData(data: unknown): IExtensionPluginDescriptorData | undefined {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return undefined;
  return data as IExtensionPluginDescriptorData;
}

async function loadExtensionPluginModule(
  record: CodeGraphyInstalledPluginRecord,
  settings: CodeGraphyWorkspaceSettings['plugins'][number],
): Promise<{
  buildIdentity: string;
  loadModule: () => Promise<unknown>;
  options?: Record<string, unknown>;
  packageSnapshotRoot: string;
}> {
  assertExtensionPluginDescriptorApiCompatibility(record.id, record.apiVersion);
  const preparedModule = await prepareCodeGraphyPluginPackageModule(record);
  const options = mergePluginOptions(record, settings);
  return {
    buildIdentity: preparedModule.buildIdentity,
    loadModule: async () => (await preparedModule.load()).moduleNamespace,
    packageSnapshotRoot: preparedModule.packageSnapshotRoot,
    ...(options ? { options } : {}),
  };
}

export async function prepareWorkspaceExtensionPluginCandidates(
  settings: CodeGraphyWorkspaceSettings,
  workspaceRoot: string,
  dependencies: WorkspacePackagePluginRegistrationDependencies,
): Promise<WorkspaceExtensionPluginCandidate[]> {
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
  const candidates: WorkspaceExtensionPluginCandidate[] = [];

  for (const record of resolved.records) {
    if (disabledPluginIds.has(record.id)) continue;

    try {
      const pluginSettings = settingsById.get(record.id) ?? {
        id: record.id,
        activation: 'inherit' as const,
      };
      const {
        buildIdentity,
        loadModule,
        options,
        packageSnapshotRoot,
      } = await loadExtensionPluginModule(
        record,
        pluginSettings,
      );
      const descriptorData = readExtensionDescriptorData(record.data);
      const registrationOptions: WorkspaceExtensionPluginRegistration['options'] = {
        ...(resolved.bundledPackageRoots.has(record.packageRoot) ? { builtIn: true } : {}),
        sourcePackage: record.package,
        sourcePackageRoot: packageSnapshotRoot,
        descriptorSignature: createWorkspacePluginDescriptorSignature(record, buildIdentity),
        ...(options ? { options } : {}),
        ...(descriptorData ? { data: descriptorData } : {}),
      };
      candidates.push({
        id: record.id,
        options: registrationOptions,
        load: async () => {
          const moduleNamespace = await loadModule();
          const plugin = await readFactory(moduleNamespace, record.package)({
            dataHost: createWorkspacePluginDataHost(workspaceRoot, record.id),
            ...(options ? { options } : {}),
          });
          try {
            validatePlugin(plugin, record);
            assertExtensionPluginApiCompatibility(plugin);
          } catch (error) {
            try {
              plugin.onUnload?.();
            } catch (unloadError) {
              const message = unloadError instanceof Error
                ? unloadError.message
                : String(unloadError);
              warn(
                `CodeGraphy Extension plugin '${plugin.id}' could not be unloaded after runtime validation failed: ${message}`,
              );
            }
            throw error;
          }
          return { plugin, options: registrationOptions };
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warn(`CodeGraphy Extension plugin '${record.id}' could not be loaded: ${message}`);
    }
  }

  return candidates;
}

export async function loadWorkspaceExtensionPluginRegistrations(
  settings: CodeGraphyWorkspaceSettings,
  workspaceRoot: string,
  dependencies: WorkspacePackagePluginRegistrationDependencies,
): Promise<WorkspaceExtensionPluginRegistration[]> {
  const warn = dependencies.warn ?? console.warn;
  const candidates = await prepareWorkspaceExtensionPluginCandidates(
    settings,
    workspaceRoot,
    dependencies,
  );
  const registrations: WorkspaceExtensionPluginRegistration[] = [];

  for (const candidate of candidates) {
    try {
      registrations.push(await candidate.load());
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warn(`CodeGraphy Extension plugin '${candidate.id}' could not be loaded: ${message}`);
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
      disposeRejectedPluginRuntime(registration.plugin, warn);
      const message = error instanceof Error ? error.message : String(error);
      warn(`CodeGraphy Extension plugin '${registration.plugin.id}' could not be registered: ${message}`);
    }
  }
}
