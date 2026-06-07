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

function mapDesiredPackageRegistrations(
  registrations: readonly WorkspacePipelinePluginRegistration[],
): Map<string, WorkspacePipelinePluginRegistration> {
  const desiredByPackage = new Map<string, WorkspacePipelinePluginRegistration>();

  for (const registration of registrations) {
    const packageName = registration.options.sourcePackage;
    if (packageName) {
      desiredByPackage.set(packageName, registration);
    }
  }

  return desiredByPackage;
}

function unregisterOutdatedPackagePlugins(
  registry: PluginRegistry,
  desiredByPackage: ReadonlyMap<string, WorkspacePipelinePluginRegistration>,
): void {
  for (const pluginInfo of registry.list()) {
    if (!pluginInfo.sourcePackage) {
      continue;
    }

    const desired = desiredByPackage.get(pluginInfo.sourcePackage);
    if (!desired || hasRegistrationChanged(pluginInfo, desired)) {
      registry.unregister(pluginInfo.plugin.id);
    }
  }
}

async function registerMissingPlugins(
  registry: PluginRegistry,
  registrations: readonly WorkspacePipelinePluginRegistration[],
  workspaceRoot: string | undefined,
): Promise<void> {
  for (const registration of registrations) {
    if (registry.get(registration.plugin.id)) {
      continue;
    }

    registry.register(registration.plugin, registration.options);
    if (workspaceRoot) {
      await registry.initializePlugin(registration.plugin.id, workspaceRoot);
    }
  }
}

export async function syncWorkspacePipelinePlugins(
  registry: PluginRegistry,
  dependencies: WorkspacePipelineInitializationDependencies,
): Promise<void> {
  const settingsResult = readWorkspacePipelineSettings(() => dependencies.getWorkspaceRoot());
  const desiredRegistrations = await collectDesiredRegistrations(settingsResult, dependencies);
  const desiredByPackage = mapDesiredPackageRegistrations(desiredRegistrations);

  unregisterOutdatedPackagePlugins(registry, desiredByPackage);
  await registerMissingPlugins(registry, desiredRegistrations, settingsResult.workspaceRoot);
}
