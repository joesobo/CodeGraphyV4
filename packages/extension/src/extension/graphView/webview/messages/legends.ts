import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type { IGroup } from '../../../../shared/settings/groups';

export interface GraphViewLegendMessageState {
  userLegends: IGroup[];
}

export interface GraphViewLegendMessageHandlers {
  persistLegends(legends: IGroup[]): Promise<void>;
  persistDefaultLegendVisibility(legendId: string, visible: boolean): Promise<void>;
  persistLegendOrder(legendIds: string[]): Promise<void>;
  recomputeGroups(): void;
  sendGroupsUpdated(): void;
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

    case 'UPDATE_DEFAULT_LEGEND_VISIBILITY':
      await handlers.persistDefaultLegendVisibility(
        message.payload.legendId,
        message.payload.visible,
      );
      handlers.recomputeGroups();
      handlers.sendGroupsUpdated();
      return true;

    case 'UPDATE_LEGEND_ORDER':
      await handlers.persistLegendOrder(message.payload.legendIds);
      handlers.recomputeGroups();
      handlers.sendGroupsUpdated();
      return true;

    default:
      return false;
  }
}
