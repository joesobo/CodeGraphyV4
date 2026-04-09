import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type {
  GraphViewSettingsMessageHandlers,
  GraphViewSettingsMessageState,
} from './router';

export async function applySettingsToggleMessage(
  message: WebviewToExtensionMessage,
  state: GraphViewSettingsMessageState,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  switch (message.type) {
    case 'TOGGLE_SOURCE':
      if (message.payload.enabled) {
        state.disabledSources.delete(message.payload.qualifiedSourceId);
      } else {
        state.disabledSources.add(message.payload.qualifiedSourceId);
      }
      await handlers.updateConfig('disabledSources', [...state.disabledSources]);
      handlers.smartRebuild('rule', message.payload.qualifiedSourceId);
      return true;

    case 'TOGGLE_PLUGIN':
      if (message.payload.enabled) {
        state.disabledPlugins.delete(message.payload.pluginId);
      } else {
        state.disabledPlugins.add(message.payload.pluginId);
      }
      await handlers.updateConfig('disabledPlugins', [...state.disabledPlugins]);
      await handlers.reprocessPluginFiles([message.payload.pluginId]);
      return true;

    case 'UPDATE_NODE_VISIBILITY': {
      const nodeVisibility = handlers.getConfig<Record<string, boolean>>('nodeVisibility', {});
      await handlers.updateConfig('nodeVisibility', {
        ...nodeVisibility,
        [message.payload.nodeType]: message.payload.visible,
      });
      handlers.sendGraphControls?.();
      return true;
    }

    case 'UPDATE_EDGE_VISIBILITY': {
      const edgeVisibility = handlers.getConfig<Record<string, boolean>>('edgeVisibility', {});
      await handlers.updateConfig('edgeVisibility', {
        ...edgeVisibility,
        [message.payload.edgeKind]: message.payload.visible,
      });
      handlers.sendGraphControls?.();
      return true;
    }

    default:
      return false;
  }
}
