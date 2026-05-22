import type { GraphViewMessageListenerContext } from '../../messages/listener';
import { DEFAULT_MAX_FILES } from '../../../../../shared/settings/defaults';
import type {
  GraphViewProviderMessageListenerDependencies,
  GraphViewProviderMessageListenerSource,
} from '../listener';
import { createSettingsConfigPersistence } from './persistence';
import { reprocessPluginFiles } from './pluginFiles';
import { readInstalledPluginDefaultOptions } from '../../settingsMessages/defaultOptions';

type GraphViewProviderSettingsContext = Pick<
  GraphViewMessageListenerContext,
  | 'getDepthMode'
  | 'updateDagMode'
  | 'updateNodeSizeMode'
  | 'getConfig'
  | 'updateConfig'
  | 'getInstalledPluginDefaultOptions'
  | 'reloadWorkspacePlugins'
  | 'sendPluginStatuses'
  | 'sendContextMenuItems'
  | 'sendPluginToolbarActions'
  | 'sendGraphViewContributionStatuses'
  | 'sendPluginWebviewInjections'
  | 'sendGraphControls'
  | 'analyzeAndSendData'
  | 'reprocessPluginFiles'
  | 'resetAllSettings'
  | 'getMaxFiles'
  | 'getPlaybackSpeed'
  | 'getDagMode'
  | 'getNodeSizeMode'
>;

export function createGraphViewProviderMessageSettingsContext(
  source: GraphViewProviderMessageListenerSource,
  dependencies: GraphViewProviderMessageListenerDependencies,
): GraphViewProviderSettingsContext {
  const settingsPersistence = createSettingsConfigPersistence(dependencies);
  const config = settingsPersistence.config;
  const persistConfig = async (key: string, value: unknown): Promise<void> =>
    settingsPersistence.persistConfig(key, value);

  return {
    updateDagMode: async dagMode => {
      source._dagMode = dagMode;
      await persistConfig(dependencies.dagModeKey, source._dagMode);
      source._sendMessage({ type: 'DAG_MODE_UPDATED', payload: { dagMode: source._dagMode } });
    },
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
    getInstalledPluginDefaultOptions: (packageName: string) =>
      readInstalledPluginDefaultOptions(packageName),
    reloadWorkspacePlugins: async () => {
      const analyzer = source._analyzer;
      if (!analyzer?.reloadWorkspacePlugins) {
        return;
      }

      source._analyzerInitialized = false;
      source._analyzerInitPromise = undefined;
      await analyzer.reloadWorkspacePlugins();
      source._analyzerInitialized = true;
      source._analyzerInitPromise = undefined;
    },
    sendPluginStatuses: () => {
      source._sendPluginStatuses();
    },
    sendContextMenuItems: () => {
      source._sendContextMenuItems();
    },
    sendPluginToolbarActions: () => {
      source._sendPluginToolbarActions?.();
    },
    sendGraphViewContributionStatuses: () => {
      source._sendGraphViewContributionStatuses?.();
    },
    sendPluginWebviewInjections: () => {
      source._sendPluginWebviewInjections();
    },
    sendGraphControls: () => {
      source._sendGraphControls?.();
    },
    analyzeAndSendData: () => source._analyzeAndSendData(),
    reprocessPluginFiles: async (pluginIds) => reprocessPluginFiles(source, pluginIds),
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
    getPlaybackSpeed: () => config.get<number>('timeline.playbackSpeed', 1.0) ?? 1.0,
    getDepthMode: () => source._depthMode,
    getDagMode: () => source._dagMode,
    getNodeSizeMode: () => source._nodeSizeMode,
  };
}
