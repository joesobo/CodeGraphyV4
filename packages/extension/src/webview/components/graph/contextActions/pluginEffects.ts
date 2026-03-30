import type { GraphContextMenuAction } from '../contextMenu/contracts';
import type { GraphContextEffect } from './effects';

export function createPluginContextActionEffects(
  action: Extract<GraphContextMenuAction, { kind: 'plugin' }>
): GraphContextEffect[] {
  return [{
    kind: 'postMessage',
    message: {
      type: 'PLUGIN_CONTEXT_MENU_ACTION',
      payload: {
        pluginId: action.pluginId,
        index: action.index,
        targetId: action.targetId,
        targetType: action.targetType,
      },
    },
  }];
}
