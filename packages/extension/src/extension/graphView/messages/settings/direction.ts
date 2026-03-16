import type { DirectionMode, WebviewToExtensionMessage } from '../../../../shared/types';
import { DEFAULT_DIRECTION_COLOR } from '../../../../shared/types';
import {
  normalizeDirectionColor,
  normalizeFolderNodeColor,
} from '../../../graphViewSettings';
import type {
  GraphViewSettingsMessageHandlers,
  GraphViewSettingsMessageState,
} from './index';

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

export async function applySettingsDirectionMessage(
  message: WebviewToExtensionMessage,
  state: GraphViewSettingsMessageState,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  switch (message.type) {
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

    default:
      return false;
  }
}
