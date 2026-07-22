import type { IPluginInfo } from '../../../../core/plugins/types/contracts';
import type { PluginRegistry } from '../../../../core/plugins/registry/manager';
import {
  getBuiltInWorkspacePipelinePluginRegistrations,
  type WorkspacePipelinePluginRegistration,
} from './builtIns';
import { loadWorkspacePackagePluginRegistrations } from './packages';
import {
  readWorkspacePipelineSettings,
  type WorkspacePipelineSettingsResult,
} from './settings';
import type { WorkspacePipelineInitializationDependencies } from './initialize';
import {
  loadWorkspaceExtensionPluginRegistrations,
  type WorkspaceExtensionPluginRegistration,
} from './extensionPackages';
import type { ExtensionPluginRegistry } from '../../../plugins/registry';

function stableOptionsString(value: unknown): string {
  if (value === undefined) {
    return '{}';
  }

  return JSON.stringify(value) ?? '{}';
}

function hasRegistrationChanged(
  current: IPluginInfo,
  desired: WorkspacePipelinePluginRegistration,
): boolean {
  return current.plugin.id !== desired.plugin.id
    || current.builtIn !== Boolean(desired.options.builtIn)
    || current.sourcePackageRoot !== desired.options.sourcePackageRoot
    || current.descriptorSignature !== desired.options.descriptorSignature
    || stableOptionsString(current.options) !== stableOptionsString(desired.options.options);
}

async function collectDesiredRegistrations(
  { settings, workspaceRoot }: WorkspacePipelineSettingsResult,
  dependencies: WorkspacePipelineInitializationDependencies,
): Promise<WorkspacePipelinePluginRegistration[]> {
  const desired = await getBuiltInWorkspacePipelinePluginRegistrations(settings, dependencies.disabledPlugins);

  if (workspaceRoot && settings) {
    desired.push(...await loadWorkspacePackagePluginRegistrations(
      settings,
      workspaceRoot,
      dependencies,
    ));
  }

  return desired;
}

function mapDesiredPackageRegistrationsById(
  registrations: readonly WorkspacePipelinePluginRegistration[],
): Map<string, WorkspacePipelinePluginRegistration> {
  const desiredById = new Map<string, WorkspacePipelinePluginRegistration>();

  for (const registration of registrations) {
    if (registration.options.sourcePackage) {
      desiredById.set(registration.plugin.id, registration);
    }
  }

  return desiredById;
}

function unregisterOutdatedPackagePlugins(
  registry: PluginRegistry,
  desiredById: ReadonlyMap<string, WorkspacePipelinePluginRegistration>,
): void {
  for (const pluginInfo of registry.list()) {
    if (!pluginInfo.sourcePackage) {
      continue;
    }

    const desired = desiredById.get(pluginInfo.plugin.id);
    if (!desired || hasRegistrationChanged(pluginInfo, desired)) {
      registry.unregister(pluginInfo.plugin.id);
    }
  }
}

async function registerMissingPlugins(
  registry: PluginRegistry,
  registrations: readonly WorkspacePipelinePluginRegistration[],
  workspaceRoot: string | undefined,
  warn: (message: string) => void,
): Promise<void> {
  for (const registration of registrations) {
    if (registry.get(registration.plugin.id)) {
      continue;
    }

    try {
      registry.register(registration.plugin, registration.options);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warn(`CodeGraphy plugin '${registration.plugin.id}' could not be registered: ${message}`);
      continue;
    }
    if (workspaceRoot) {
      await registry.initializePlugin(registration.plugin.id, workspaceRoot);
    }
  }
}

function hasExtensionRegistrationChanged(
  current: ReturnType<ExtensionPluginRegistry['list']>[number],
  desired: WorkspaceExtensionPluginRegistration,
): boolean {
  return current.sourcePackage !== desired.options.sourcePackage
    || current.sourcePackageRoot !== desired.options.sourcePackageRoot
    || current.descriptorSignature !== desired.options.descriptorSignature
    || current.builtIn !== Boolean(desired.options.builtIn);
}

async function syncExtensionPlugins(
  registry: ExtensionPluginRegistry,
  settingsResult: WorkspacePipelineSettingsResult,
  dependencies: WorkspacePipelineInitializationDependencies,
): Promise<void> {
  if (!settingsResult.workspaceRoot || !settingsResult.settings) {
    for (const info of registry.list()) registry.unregister(info.plugin.id);
    return;
  }

  const desired = await loadWorkspaceExtensionPluginRegistrations(
    settingsResult.settings,
    settingsResult.workspaceRoot,
    dependencies,
  );
  const warn = dependencies.warn ?? console.warn;
  const desiredById = new Map(desired.map(registration => [registration.plugin.id, registration]));

  for (const current of registry.list()) {
    const registration = desiredById.get(current.plugin.id);
    if (!registration || hasExtensionRegistrationChanged(current, registration)) {
      registry.unregister(current.plugin.id);
    }
  }

  for (const registration of desired) {
    if (!registry.get(registration.plugin.id)) {
      try {
        registry.register(registration.plugin, registration.options);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        warn(`CodeGraphy Extension plugin '${registration.plugin.id}' could not be registered: ${message}`);
      }
    }
  }
  await registry.initializeAll(settingsResult.workspaceRoot);
}

export async function syncWorkspacePipelinePlugins(
  registry: PluginRegistry,
  dependencies: WorkspacePipelineInitializationDependencies,
): Promise<void> {
  const settingsResult = readWorkspacePipelineSettings(() => dependencies.getWorkspaceRoot());
  const desiredRegistrations = await collectDesiredRegistrations(settingsResult, dependencies);
  const desiredById = mapDesiredPackageRegistrationsById(desiredRegistrations);

  unregisterOutdatedPackagePlugins(registry, desiredById);
  await registerMissingPlugins(
    registry,
    desiredRegistrations,
    settingsResult.workspaceRoot,
    dependencies.warn ?? console.warn,
  );
  await syncExtensionPlugins(registry.extensionPlugins, settingsResult, dependencies);
}
