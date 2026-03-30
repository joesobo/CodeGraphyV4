import type { GraphViewMessageListenerContext } from '../messages/listener';
import type {
  GraphViewProviderMessageListenerDependencies,
  GraphViewProviderMessageListenerSource,
} from './listener';

type GraphViewProviderSettingsContext = Pick<
  GraphViewMessageListenerContext,
  | 'updateDagMode'
  | 'updateNodeSizeMode'
  | 'getConfig'
  | 'updateConfig'
  | 'resetAllSettings'
  | 'getMaxFiles'
  | 'getPlaybackSpeed'
  | 'getDagMode'
  | 'getNodeSizeMode'
  | 'getFolderNodeColor'
>;

export function createGraphViewProviderMessageSettingsContext(
  source: GraphViewProviderMessageListenerSource,
  dependencies: GraphViewProviderMessageListenerDependencies,
): GraphViewProviderSettingsContext {
  const config = dependencies.workspace.getConfiguration('codegraphy');

  return {
    updateDagMode: async dagMode => {
      source._dagMode = dagMode;
      await source._context.workspaceState.update(dependencies.dagModeKey, source._dagMode);
      source._sendMessage({ type: 'DAG_MODE_UPDATED', payload: { dagMode: source._dagMode } });
    },
    updateNodeSizeMode: async nodeSizeMode => {
      source._nodeSizeMode = nodeSizeMode;
      await source._context.workspaceState.update(
        dependencies.nodeSizeModeKey,
        source._nodeSizeMode,
      );
      source._sendMessage({
        type: 'NODE_SIZE_MODE_UPDATED',
        payload: { nodeSizeMode: source._nodeSizeMode },
      });
    },
    getConfig: (key, defaultValue) => config.get(key, defaultValue),
    updateConfig: async (key, value) => {
      const target = dependencies.getConfigTarget(dependencies.workspace.workspaceFolders);
      await dependencies.workspace.getConfiguration('codegraphy').update(key, value, target);
    },
    resetAllSettings: async () => {
      const snapshot = dependencies.captureSettingsSnapshot(
        config,
        source._getPhysicsSettings(),
        source._nodeSizeMode,
      );
      const action = dependencies.createResetSettingsAction(
        snapshot,
        dependencies.getConfigTarget(dependencies.workspace.workspaceFolders),
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
    getDagMode: () => source._dagMode,
    getNodeSizeMode: () => source._nodeSizeMode,
    getFolderNodeColor: () =>
      dependencies.normalizeFolderNodeColor(
        config.get<string>('folderNodeColor', dependencies.defaultFolderNodeColor),
      ),
  };
}
