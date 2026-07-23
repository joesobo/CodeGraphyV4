import { DEFAULT_MAX_FILES } from '../../../../../shared/settings/defaults';
import type {
  GraphViewProviderMessageListenerDependencies,
  GraphViewProviderMessageListenerSource,
} from '../listener';
import { createSettingsConfigPersistence } from './persistence';
import {
  readInstalledPluginDefaultOptions,
  readInstalledPluginUpdateImpact,
} from '../../settingsMessages/defaultOptions';
import type { GraphViewProviderSettingsContext } from './contracts';
import { createPluginSettingsMethods } from './pluginMethods';
import { readBundledWorkspacePluginPackageRootsSync } from '../../../../pipeline/plugins/bootstrap/bundledPackages';

export function createGraphViewProviderMessageSettingsContext(
  source: GraphViewProviderMessageListenerSource,
  dependencies: GraphViewProviderMessageListenerDependencies,
): GraphViewProviderSettingsContext {
  const settingsPersistence = createSettingsConfigPersistence(dependencies);
  const config = settingsPersistence.config;
  const bundledPackageRoots = readBundledWorkspacePluginPackageRootsSync(
    source._context.extensionUri?.fsPath,
  );
  const persistConfig = async (key: string, value: unknown): Promise<void> =>
    settingsPersistence.persistConfig(key, value);
  return {
    ...createPluginSettingsMethods(source),
    updateNodeSizeMode: async nodeSizeMode => {
      source._nodeSizeMode = nodeSizeMode;
      await persistConfig(dependencies.nodeSizeModeKey, source._nodeSizeMode);
      source._sendMessage({
        type: 'NODE_SIZE_MODE_UPDATED',
        payload: { nodeSizeMode: source._nodeSizeMode },
      });
    },
    getConfig: (key, defaultValue) => config.get(key, defaultValue) ?? defaultValue,
    updateConfig: async (key, value) => persistConfig(key, value),
    getInstalledPluginDefaultOptions: (pluginId: string) =>
      readInstalledPluginDefaultOptions(pluginId, { bundledPackageRoots }),
    getInstalledPluginUpdateImpact: (pluginId: string) => (
      source._analyzer?.registry?.get?.(pluginId)?.plugin.updateImpact
      ?? readInstalledPluginUpdateImpact(pluginId, { bundledPackageRoots })
    ),
    analyzeAndSendData: () => source._analyzeAndSendData(),
    hydrateGraphScope: () => source.hydrateGraphScope?.() ?? Promise.resolve(false),
    hydratePluginGraphScope: pluginIds =>
      source.hydratePluginGraphScope?.(pluginIds) ?? Promise.resolve(false),
    reprocessGraphScope: () => source.refreshAnalysisScope(),
    resetAllSettings: async () => {
      const snapshot = dependencies.captureSettingsSnapshot(
        config,
        source._getPhysicsSettings(),
        source._nodeSizeMode,
      );
      const action = dependencies.createResetSettingsAction(
        snapshot,
        undefined,
        source._context,
        () => source._sendAllSettings(),
        mode => {
          source._nodeSizeMode = mode;
        },
        () => source._analyzeAndSendData(),
      );
      await dependencies.executeUndoAction(action);
    },
    getMaxFiles: () => config.get<number>('maxFiles', DEFAULT_MAX_FILES) ?? DEFAULT_MAX_FILES,
    getDepthMode: () => source._depthMode,
    getNodeSizeMode: () => source._nodeSizeMode,
  };
}
