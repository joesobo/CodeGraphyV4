import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type { IGroup } from '../../../../shared/settings/groups';

export interface GraphViewLegendMessageState {
  userLegends: IGroup[];
}

export interface GraphViewLegendMessageHandlers {
  persistLegends(legends: IGroup[]): Promise<void>;
}

function toPersistableGroup(group: IGroup): IGroup {
  const persistable = { ...group };
  delete persistable.imageUrl;
  delete persistable.isPluginDefault;
  delete persistable.pluginName;
  return persistable;
}

export async function applyLegendMessage(
  message: WebviewToExtensionMessage,
  state: GraphViewLegendMessageState,
  handlers: GraphViewLegendMessageHandlers,
): Promise<boolean> {
  switch (message.type) {
    case 'UPDATE_LEGENDS':
      state.userLegends = message.payload.legends.map(toPersistableGroup);
      await handlers.persistLegends(state.userLegends);
      return true;

    default:
      return false;
  }
}
