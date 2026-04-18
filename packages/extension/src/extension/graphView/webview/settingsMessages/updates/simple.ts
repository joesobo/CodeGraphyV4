import type { WebviewToExtensionMessage } from '../../../../../shared/protocol/webviewToExtension';
import type { GraphViewSettingsMessageHandlers } from '../router';

type SettingsUpdateConfigKey =
  | 'showOrphans'
  | 'bidirectionalEdges'
  | 'maxFiles';

function getSimpleSettingsUpdateConfig(
  message: WebviewToExtensionMessage,
): { key: SettingsUpdateConfigKey; value: unknown } | undefined {
  switch (message.type) {
    case 'UPDATE_SHOW_ORPHANS':
      return { key: 'showOrphans', value: message.payload.showOrphans };
    case 'UPDATE_BIDIRECTIONAL_MODE':
      return { key: 'bidirectionalEdges', value: message.payload.bidirectionalMode };
    case 'UPDATE_MAX_FILES':
      return { key: 'maxFiles', value: message.payload.maxFiles };
    default:
      return undefined;
  }
}

export async function applySimpleSettingsUpdate(
  message: WebviewToExtensionMessage,
  handlers: GraphViewSettingsMessageHandlers,
): Promise<boolean> {
  const update = getSimpleSettingsUpdateConfig(message);
  if (!update) {
    return false;
  }

  await handlers.updateConfig(update.key, update.value);
  return true;
}
