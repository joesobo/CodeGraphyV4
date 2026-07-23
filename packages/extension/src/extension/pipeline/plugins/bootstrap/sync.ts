import type { IPluginInfo } from '../../../../core/plugins/types/contracts';
import type { PluginRegistry } from '../../../../core/plugins/registry/manager';
import type { WorkspacePluginRegistry } from '../registry';
import {
  getBuiltInWorkspacePipelinePluginCandidates,
  type WorkspacePipelinePluginCandidate,
  type WorkspacePipelinePluginRegistration,
} from './builtIns';
import { prepareWorkspacePackagePluginCandidates } from './packages';
import {
  readWorkspacePipelineSettings,
  type WorkspacePipelineSettingsResult,
} from './settings';
import type { WorkspacePipelineInitializationDependencies } from './initialize';
import {
  prepareWorkspaceExtensionPluginCandidates,
  type WorkspaceExtensionPluginCandidate,
  type WorkspaceExtensionPluginRegistration,
} from './extensionPackages';
import type { ExtensionPluginRegistry } from '../../../plugins/registry';
import { disposeRejectedPluginRuntime } from './registrationCleanup';

function stableOptionsString(value: unknown): string {
  if (value === undefined) {
    return '{}';
  }

  return JSON.stringify(value) ?? '{}';
}

function hasRegistrationChanged(
  current: IPluginInfo,
  desired: WorkspacePipelinePluginCandidate,
): boolean {
  return current.plugin.id !== desired.id
    || current.builtIn !== Boolean(desired.options.builtIn)
    || current.sourcePackageRoot !== desired.options.sourcePackageRoot
    || current.sourceSignature !== desired.options.sourceSignature
    || stableOptionsString(current.options) !== stableOptionsString(desired.options.options);
}

async function collectDesiredCandidates(
  { settings, workspaceRoot }: WorkspacePipelineSettingsResult,
  dependencies: WorkspacePipelineInitializationDependencies,
): Promise<WorkspacePipelinePluginCandidate[]> {
  const desired = await getBuiltInWorkspacePipelinePluginCandidates(
    settings,
    dependencies.disabledPlugins,
    { ...(dependencies.userHomeDir ? { homeDir: dependencies.userHomeDir } : {}) },
  );

  if (workspaceRoot && settings) {
    desired.push(...await prepareWorkspacePackagePluginCandidates(
      settings,
      workspaceRoot,
      dependencies,
    ));
  }

  return desired;
}

function mapDesiredPackageRegistrationsById(
  candidates: readonly WorkspacePipelinePluginCandidate[],
): Map<string, WorkspacePipelinePluginCandidate> {
  const desiredById = new Map<string, WorkspacePipelinePluginCandidate>();

  for (const candidate of candidates) {
    if (candidate.options.sourcePackage) {
      desiredById.set(candidate.id, candidate);
    }
  }

  return desiredById;
}

function unregisterOutdatedPackagePlugins(
  registry: PluginRegistry,
  desiredById: ReadonlyMap<string, WorkspacePipelinePluginCandidate>,
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
  candidates: readonly WorkspacePipelinePluginCandidate[],
  workspaceRoot: string | undefined,
  warn: (message: string) => void,
): Promise<void> {
  for (const candidate of candidates) {
    if (registry.get(candidate.id)) {
      continue;
    }

    let registration: WorkspacePipelinePluginRegistration;
    try {
      registration = await candidate.load();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warn(`CodeGraphy plugin '${candidate.id}' could not be loaded: ${message}`);
      continue;
    }
    try {
      registry.register(registration.plugin, registration.options);
    } catch (error) {
      disposeRejectedPluginRuntime(registration.plugin, warn);
      const message = error instanceof Error ? error.message : String(error);
      warn(`CodeGraphy plugin '${candidate.id}' could not be registered: ${message}`);
      continue;
    }
    if (workspaceRoot) {
      await registry.initializePlugin(registration.plugin.id, workspaceRoot);
    }
  }
}

function hasExtensionRegistrationChanged(
  current: ReturnType<ExtensionPluginRegistry['list']>[number],
  desired: WorkspaceExtensionPluginCandidate,
): boolean {
  return current.sourcePackage !== desired.options.sourcePackage
    || current.sourcePackageRoot !== desired.options.sourcePackageRoot
    || current.descriptorSignature !== desired.options.descriptorSignature
    || current.builtIn !== Boolean(desired.options.builtIn)
    || stableOptionsString(current.options) !== stableOptionsString(desired.options.options);
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

  const desired = await prepareWorkspaceExtensionPluginCandidates(
    settingsResult.settings,
    settingsResult.workspaceRoot,
    dependencies,
  );
  const warn = dependencies.warn ?? console.warn;
  const desiredById: Map<string, WorkspaceExtensionPluginCandidate> = new Map(
    desired.map(candidate => [candidate.id, candidate]),
  );

  for (const current of registry.list()) {
    const candidate = desiredById.get(current.plugin.id);
    if (!candidate || hasExtensionRegistrationChanged(current, candidate)) {
      registry.unregister(current.plugin.id);
    }
  }

  for (const candidate of desired) {
    if (!registry.get(candidate.id)) {
      let registration: WorkspaceExtensionPluginRegistration;
      try {
        registration = await candidate.load();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        warn(`CodeGraphy Extension plugin '${candidate.id}' could not be loaded: ${message}`);
        continue;
      }
      try {
        registry.register(registration.plugin, registration.options);
      } catch (error) {
        disposeRejectedPluginRuntime(registration.plugin, warn);
        const message = error instanceof Error ? error.message : String(error);
        warn(`CodeGraphy Extension plugin '${candidate.id}' could not be registered: ${message}`);
      }
    }
  }
  await registry.initializeAll(settingsResult.workspaceRoot);
}

export async function syncWorkspacePipelinePlugins(
  registry: WorkspacePluginRegistry,
  dependencies: WorkspacePipelineInitializationDependencies,
): Promise<void> {
  const settingsResult = readWorkspacePipelineSettings(() => dependencies.getWorkspaceRoot());
  const desiredCandidates = await collectDesiredCandidates(settingsResult, dependencies);
  const desiredById = mapDesiredPackageRegistrationsById(desiredCandidates);

  unregisterOutdatedPackagePlugins(registry, desiredById);
  await registerMissingPlugins(
    registry,
    desiredCandidates,
    settingsResult.workspaceRoot,
    dependencies.warn ?? console.warn,
  );
  await syncExtensionPlugins(registry.extensionPlugins, settingsResult, dependencies);
}
