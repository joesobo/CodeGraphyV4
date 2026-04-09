import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type { IGroup } from '../../../../shared/settings/groups';

export interface GraphViewGroupMessageState {
  userGroups: IGroup[];
}

export interface GraphViewGroupMessageHandlers {
  persistGroups(groups: IGroup[]): Promise<void>;
}

function toPersistableGroup(group: IGroup): IGroup {
  const persistable = { ...group };
  delete persistable.imageUrl;
  delete persistable.isPluginDefault;
  delete persistable.pluginName;
  return persistable;
}

export async function applyGroupMessage(
  message: WebviewToExtensionMessage,
  state: GraphViewGroupMessageState,
  handlers: GraphViewGroupMessageHandlers,
): Promise<boolean> {
  switch (message.type) {
    case 'UPDATE_LEGENDS':
      state.userGroups = message.payload.legends.map(toPersistableGroup);
      await handlers.persistGroups(state.userGroups);
      return true;

    default:
      return false;
  }
}
