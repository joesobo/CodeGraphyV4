import type {
  DirectionMode,
  ExtensionToWebviewMessage,
  IGraphData,
  WebviewToExtensionMessage,
} from '../../../shared/types';
import { DEFAULT_DIRECTION_COLOR } from '../../../shared/types';
import {
  normalizeDirectionColor,
  normalizeFolderNodeColor,
} from '../../graphViewSettings';

export interface GraphViewSettingsMessageState {
  activeViewId: string;
  disabledPlugins: Set<string>;
  disabledRules: Set<string>;
  filterPatterns: string[];
  graphData: IGraphData;
  viewContext: { folderNodeColor?: string };
}

export interface GraphViewSettingsMessageHandlers {
  getConfig<T>(key: string, defaultValue: T): T;
  updateConfig(key: string, value: unknown): Promise<void>;
  getPluginFilterPatterns(): string[];
  sendMessage(message: ExtensionToWebviewMessage): void;
  applyViewTransform(): void;
  smartRebuild(kind: 'rule' | 'plugin', id: string): void;
  resetAllSettings(): Promise<void>;
}

function buildDirectionSettingsPayload(
  directionMode: DirectionMode,
  handlers: GraphViewSettingsMessageHandlers,
) {
  return {
    directionMode,
    particleSpeed: handlers.getConfig<number>('particleSpeed', 0.005),
    particleSize: handlers.getConfig<number>('particleSize', 4),
    directionColor: normalizeDirectionColor(
      handlers.getConfig<string>('directionColor', DEFAULT_DIRECTION_COLOR),
    ),
  };
}

export async function applySettingsMessage(
  message: WebviewToExtensionMessage,
  state: GraphViewSettingsMessageState,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  switch (message.type) {
    case 'RESET_ALL_SETTINGS':
      await handlers.resetAllSettings();
      return true;

    case 'UPDATE_FILTER_PATTERNS':
      state.filterPatterns = message.payload.patterns;
      await handlers.updateConfig('filterPatterns', state.filterPatterns);
      handlers.sendMessage({
        type: 'FILTER_PATTERNS_UPDATED',
        payload: {
          patterns: state.filterPatterns,
          pluginPatterns: handlers.getPluginFilterPatterns(),
        },
      });
      return true;

    case 'UPDATE_SHOW_ORPHANS':
      await handlers.updateConfig('showOrphans', message.payload.showOrphans);
      return true;

    case 'UPDATE_BIDIRECTIONAL_MODE':
      await handlers.updateConfig('bidirectionalEdges', message.payload.bidirectionalMode);
      return true;

    case 'UPDATE_DIRECTION_MODE': {
      const directionMode = message.payload.directionMode;
      await handlers.updateConfig('directionMode', directionMode);
      handlers.sendMessage({
        type: 'DIRECTION_SETTINGS_UPDATED',
        payload: buildDirectionSettingsPayload(directionMode, handlers),
      });
      return true;
    }

    case 'UPDATE_DIRECTION_COLOR': {
      const directionColor = normalizeDirectionColor(message.payload.directionColor);
      await handlers.updateConfig('directionColor', directionColor);
      handlers.sendMessage({
        type: 'DIRECTION_SETTINGS_UPDATED',
        payload: {
          ...buildDirectionSettingsPayload(
            handlers.getConfig<DirectionMode>('directionMode', 'arrows'),
            handlers,
          ),
          directionColor,
        },
      });
      return true;
    }

    case 'UPDATE_FOLDER_NODE_COLOR': {
      const folderNodeColor = normalizeFolderNodeColor(message.payload.folderNodeColor);
      await handlers.updateConfig('folderNodeColor', folderNodeColor);
      state.viewContext.folderNodeColor = folderNodeColor;
      handlers.sendMessage({
        type: 'FOLDER_NODE_COLOR_UPDATED',
        payload: { folderNodeColor },
      });
      if (state.activeViewId === 'codegraphy.folder') {
        handlers.applyViewTransform();
        handlers.sendMessage({
          type: 'GRAPH_DATA_UPDATED',
          payload: state.graphData,
        });
      }
      return true;
    }

    case 'UPDATE_PARTICLE_SETTING':
      await handlers.updateConfig(message.payload.key, message.payload.value);
      return true;

    case 'UPDATE_SHOW_LABELS':
      await handlers.updateConfig('showLabels', message.payload.showLabels);
      handlers.sendMessage({
        type: 'SHOW_LABELS_UPDATED',
        payload: { showLabels: message.payload.showLabels },
      });
      return true;

    case 'UPDATE_MAX_FILES':
      await handlers.updateConfig('maxFiles', message.payload.maxFiles);
      return true;

    case 'TOGGLE_RULE':
      if (message.payload.enabled) {
        state.disabledRules.delete(message.payload.qualifiedId);
      } else {
        state.disabledRules.add(message.payload.qualifiedId);
      }
      await handlers.updateConfig('disabledRules', [...state.disabledRules]);
      handlers.smartRebuild('rule', message.payload.qualifiedId);
      return true;

    case 'TOGGLE_PLUGIN':
      if (message.payload.enabled) {
        state.disabledPlugins.delete(message.payload.pluginId);
      } else {
        state.disabledPlugins.add(message.payload.pluginId);
      }
      await handlers.updateConfig('disabledPlugins', [...state.disabledPlugins]);
      handlers.smartRebuild('plugin', message.payload.pluginId);
      return true;

    default:
      return false;
  }
}
