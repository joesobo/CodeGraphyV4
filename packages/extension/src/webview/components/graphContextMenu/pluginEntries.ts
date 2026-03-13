import type { IPluginContextMenuItem } from '../../../shared/types';
import { pluginItem, separator } from './entryFactories';
import type { GraphContextMenuEntry, GraphContextSelection } from './types';

export function buildPluginEntries(
  selection: GraphContextSelection,
  pluginItems: readonly IPluginContextMenuItem[]
): GraphContextMenuEntry[] {
  let targetId: string | undefined;
  let targetType: 'node' | 'edge' | undefined;
  let eligibleItems: IPluginContextMenuItem[] = [];

  if (selection.kind === 'node' && selection.targets.length === 1) {
    targetId = selection.targets[0];
    targetType = 'node';
    eligibleItems = pluginItems.filter(item => item.when === 'node' || item.when === 'both');
  } else if (selection.kind === 'edge' && selection.edgeId) {
    targetId = selection.edgeId;
    targetType = 'edge';
    eligibleItems = pluginItems.filter(item => item.when === 'edge' || item.when === 'both');
  }

  if (!targetId || !targetType) return [];
  if (eligibleItems.length === 0) return [];

  const entries: GraphContextMenuEntry[] = [separator('plugins-separator')];
  let previousGroup: string | undefined;

  for (let idx = 0; idx < eligibleItems.length; idx++) {
    const item = eligibleItems[idx];
    if (idx > 0 && item.group && previousGroup && item.group !== previousGroup) {
      entries.push(separator(`plugins-group-separator-${idx}`));
    }
    previousGroup = item.group;
    entries.push(
      pluginItem(
        `plugin-${item.pluginId}-${item.index}`,
        item.label,
        item.pluginId,
        item.index,
        targetId,
        targetType
      )
    );
  }

  return entries;
}
