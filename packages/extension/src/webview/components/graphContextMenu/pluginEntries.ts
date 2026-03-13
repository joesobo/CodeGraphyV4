import type { IPluginContextMenuItem } from '../../../shared/types';
import { pluginItem, separator } from './entryFactories';
import type { GraphContextMenuEntry, GraphContextSelection } from './types';

export function buildPluginEntries(
  selection: GraphContextSelection,
  pluginItems: readonly IPluginContextMenuItem[]
): GraphContextMenuEntry[] {
  if (selection.kind !== 'node' || selection.targets.length !== 1) return [];
  const targetId = selection.targets[0];
  const eligibleItems = pluginItems.filter(item => item.when === 'node' || item.when === 'both');
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
        'node'
      )
    );
  }

  return entries;
}
