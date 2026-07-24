import { createEmptyWorkspaceAnalysisCache } from '../analysis/cache';
import { createDisabledPluginSet } from '../plugins/activityState/model';
import { discoverWorkspaceIndexFiles } from './discovery';
import { createWorkspaceIndexRegistry } from './registry';
import { createEffectiveIndexSettings } from './settings';
import {
  createCodeGraphyWorkspacePluginSignature,
  createCodeGraphyWorkspaceSettingsSignature,
} from '../workspace/signatures';
import { assertWorkspaceEngineActive, type WorkspaceEngineRuntime } from './engineRuntime';

export async function initializeWorkspaceEngine(runtime: WorkspaceEngineRuntime): Promise<void> {
  const { options, state, workspaceRoot } = runtime;
  const previousRegistry = state.registry;
  const previousIndexSignature = state.settings && previousRegistry
    ? [
        createCodeGraphyWorkspaceSettingsSignature(state.settings),
        createCodeGraphyWorkspacePluginSignature(
          previousRegistry.list().map(({ plugin }) => plugin),
        ),
      ].join('|')
    : undefined;
  state.settings = createEffectiveIndexSettings(workspaceRoot, options);
  const disabledPlugins = createDisabledPluginSet(state.settings, options.disabledPlugins);
  const registryResult = await createWorkspaceIndexRegistry(options, state.settings, workspaceRoot, disabledPlugins);
  const registry = registryResult.registry;
  const nextIndexSignature = [
    createCodeGraphyWorkspaceSettingsSignature(state.settings),
    createCodeGraphyWorkspacePluginSignature(registry.list().map(({ plugin }) => plugin)),
  ].join('|');
  if (previousIndexSignature !== undefined && previousIndexSignature !== nextIndexSignature) {
    state.cache = createEmptyWorkspaceAnalysisCache();
  }
  previousRegistry?.disposeAll();
  if (runtime.disposed) {
    registry.disposeAll();
    assertWorkspaceEngineActive(runtime);
  }
  state.registry = registry;
  state.loadedPackagePlugins = registryResult.loadedPackagePlugins;
  state.registeredPluginIds = new Set(registry.list().map(info => info.plugin.id));
  state.workspaceRoot = workspaceRoot;
  await registry.initializeAll(workspaceRoot);
  if (runtime.disposed) {
    registry.disposeAll();
    if (state.registry === registry) state.registry = undefined;
    assertWorkspaceEngineActive(runtime);
  }
  const activePluginIds = new Set(registry.list().map(info => info.plugin.id));
  state.failedPluginIds = new Set(
    [...state.registeredPluginIds].filter(pluginId => !activePluginIds.has(pluginId)),
  );
}

export async function discoverWorkspaceEngineFiles(
  runtime: WorkspaceEngineRuntime,
): Promise<void> {
  const { discovery, options, state, workspaceRoot } = runtime;
  if (!state.registry || !state.settings) return;

  const disabledPlugins = createDisabledPluginSet(state.settings, options.disabledPlugins);
  const disabledFilterPatternsByPlugin = new Map(
    state.settings.plugins.map(plugin => [
      plugin.id,
      new Set(plugin.disabledFilterPatterns ?? []),
    ] as const),
  );
  const pluginFilterPatterns = state.registry.list().flatMap(({ plugin }) => {
    if (disabledPlugins.has(plugin.id)) return [];
    const disabledPatterns = disabledFilterPatternsByPlugin.get(plugin.id) ?? new Set<string>();
    return (plugin.defaultFilters ?? []).filter(pattern => !disabledPatterns.has(pattern));
  });

  state.discoveryResult = await discoverWorkspaceIndexFiles({
    discovery,
    options,
    pluginFilterPatterns,
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
