import type { GraphViewMessageListenerContext } from '../messages/listener';
import type {
  GraphViewProviderMessageListenerDependencies,
  GraphViewProviderMessageListenerSource,
} from './listener';
import {
  getCodeGraphyConfiguration,
  updateCodeGraphyConfigurationSilently,
} from '../../../repoSettings/current';

type GraphViewProviderSettingsContext = Pick<
  GraphViewMessageListenerContext,
  | 'getDepthMode'
  | 'updateDagMode'
  | 'updateNodeSizeMode'
  | 'getConfig'
  | 'updateConfig'
  | 'sendGraphControls'
  | 'analyzeAndSendData'
  | 'reprocessPluginFiles'
  | 'resetAllSettings'
  | 'getMaxFiles'
  | 'getPlaybackSpeed'
  | 'getDagMode'
  | 'getNodeSizeMode'
>;

const SILENT_CONFIG_KEYS = new Set([
  'bidirectionalEdges',
  'directionColor',
  'directionMode',
  'disabledPlugins',
  'edgeColors',
  'edgeVisibility',
  'filterPatterns',
  'maxFiles',
  'nodeColors',
  'nodeVisibility',
  'particleSize',
  'particleSpeed',
  'pluginOrder',
  'showLabels',
]);

export function createGraphViewProviderMessageSettingsContext(
  source: GraphViewProviderMessageListenerSource,
  dependencies: GraphViewProviderMessageListenerDependencies,
): GraphViewProviderSettingsContext {
  const config = getCodeGraphyConfiguration();
  const persistConfig = async (key: string, value: unknown): Promise<void> => {
    if (
      SILENT_CONFIG_KEYS.has(key)
      || key === dependencies.dagModeKey
      || key === dependencies.nodeSizeModeKey
    ) {
      await updateCodeGraphyConfigurationSilently(key, value);
      return;
    }

    await config.update(key, value);
  };

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
    getConfig: (key, defaultValue) => config.get(key, defaultValue),
    updateConfig: async (key, value) => persistConfig(key, value),
    sendGraphControls: () => {
      source._sendGraphControls?.();
    },
    analyzeAndSendData: () => source._analyzeAndSendData(),
    reprocessPluginFiles: async (pluginIds) => {
      const invalidatedFilePaths = source.invalidatePluginFiles?.(pluginIds);
      if (invalidatedFilePaths && invalidatedFilePaths.length > 0) {
        await source.refreshChangedFiles(invalidatedFilePaths);
        return;
      }

      if (invalidatedFilePaths) {
        return;
      }

      await source._analyzeAndSendData();
    },
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
    getMaxFiles: () => config.get<number>('maxFiles', 500),
    getPlaybackSpeed: () => config.get<number>('timeline.playbackSpeed', 1.0),
    getDepthMode: () => source._depthMode,
    getDagMode: () => source._dagMode,
    getNodeSizeMode: () => source._nodeSizeMode,
  };
}
