import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type { DirectionMode } from '../../../../shared/settings/modes';
import { DEFAULT_DIRECTION_COLOR } from '../../../../shared/fileColors';
import { normalizeDirectionColor } from '../../settings/reader';
import type {
  GraphViewSettingsMessageHandlers,
  GraphViewSettingsMessageState,
} from './router';

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
  _state: GraphViewSettingsMessageState,
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
    default:
      return false;
  }
}
