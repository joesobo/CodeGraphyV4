import { createEmptyWorkspaceAnalysisCache } from '../analysis/cache';
import { createDisabledPluginSet } from '../plugins/activityState/model';
import { discoverWorkspaceIndexFiles } from './discovery';
import { createWorkspaceIndexRegistry } from './registry';
import { createEffectiveIndexSettings } from './settings';
import type { WorkspaceEngineRuntime } from './engineRuntime';

export async function initializeWorkspaceEngine(runtime: WorkspaceEngineRuntime): Promise<void> {
  const { options, state, workspaceRoot } = runtime;
  state.cache = createEmptyWorkspaceAnalysisCache();
  state.settings = createEffectiveIndexSettings(workspaceRoot, options);
  const disabledPlugins = createDisabledPluginSet(state.settings, options.disabledPlugins);
  const registryResult = await createWorkspaceIndexRegistry(options, state.settings, workspaceRoot, disabledPlugins);
  state.registry = registryResult.registry;
  state.loadedPackagePlugins = registryResult.loadedPackagePlugins;
  state.workspaceRoot = workspaceRoot;
  await state.registry.initializeAll(workspaceRoot);
}

export async function discoverWorkspaceEngineFiles(
  runtime: WorkspaceEngineRuntime,
): Promise<void> {
  const { discovery, options, state, workspaceRoot } = runtime;
  if (!state.registry || !state.settings) return;

  state.discoveryResult = await discoverWorkspaceIndexFiles({
    discovery,
    options,
    settings: state.settings,
    workspaceRoot,
  });
  state.discoveredDirectories = state.discoveryResult.directories ?? [];
  state.discoveredFiles = state.discoveryResult.files;
}

export function createWorkspaceEngineDisabledPlugins(runtime: WorkspaceEngineRuntime): Set<string> {
  return runtime.state.settings
    ? createDisabledPluginSet(runtime.state.settings, runtime.options.disabledPlugins)
    : new Set(runtime.options.disabledPlugins ?? []);
}
