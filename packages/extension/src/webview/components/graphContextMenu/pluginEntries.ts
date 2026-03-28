import type { IPluginContextMenuItem } from '../../../shared/contracts';
import { pluginItem, separator } from './entryFactories';
import type { GraphContextMenuEntry, GraphContextSelection } from './types';
import { classifyTarget } from './targetClassification';

export function buildPluginEntries(
  selection: GraphContextSelection,
  pluginItems: readonly IPluginContextMenuItem[]
): GraphContextMenuEntry[] {
  const classified = classifyTarget(selection, pluginItems);
  if (!classified) return [];

  const { targetId, targetType, eligibleItems } = classified;
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
