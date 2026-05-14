import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';
import type { IGroup } from '../../../../shared/settings/groups';
import { writeIconImports, type IconImportMessageHandlers } from './iconImports';

export interface GraphViewLegendMessageState {
  userLegends: IGroup[];
}

export interface GraphViewLegendMessageHandlers extends IconImportMessageHandlers {
  persistLegends(legends: IGroup[]): Promise<void>;
  persistDefaultLegendVisibility(legendId: string, visible: boolean): Promise<void>;
  persistDefaultLegendVisibilityBatch(legendVisibility: Record<string, boolean>): Promise<void>;
  persistLegendOrder(legendIds: string[]): Promise<void>;
  recomputeGroups(): void;
  sendGroupsUpdated(): void;
}

function toPersistableGroup(group: IGroup): IGroup {
  const persistable = { ...group };
  delete persistable.imageUrl;
  delete persistable.isPluginDefault;
  delete persistable.pluginId;
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
      await writeIconImports(message.payload.iconImports, handlers);
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

    case 'UPDATE_DEFAULT_LEGEND_VISIBILITY_BATCH':
      await handlers.persistDefaultLegendVisibilityBatch(message.payload.legendVisibility);
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
