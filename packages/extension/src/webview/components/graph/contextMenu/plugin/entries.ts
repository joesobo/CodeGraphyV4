import type { IPluginContextMenuItem } from '../../../../../shared/plugins/contextMenu';
import { pluginItem, separator } from '../common/entryFactories';
import type { GraphContextMenuEntry } from '../contracts';
import type { GraphContextMenuDecision } from '../decision/model';
import { classifyPluginTarget } from '../targetClassification';

export function buildPluginEntriesForDecision(
  decision: GraphContextMenuDecision,
  pluginItems: readonly IPluginContextMenuItem[]
): GraphContextMenuEntry[] {
  const classified = classifyPluginTarget(decision, pluginItems);
  return buildClassifiedPluginEntries(classified);
}

function buildClassifiedPluginEntries(
  classified: ReturnType<typeof classifyPluginTarget>
): GraphContextMenuEntry[] {
  if (!classified) return [];

  const { targetId, targetType, eligibleItems } = classified;
  if (eligibleItems.length === 0) return [];

  const entries: GraphContextMenuEntry[] = [separator('plugins-separator')];
  let previousGroup: string | undefined;

  for (let idx = 0; idx < eligibleItems.length; idx++) {
    const item = eligibleItems[idx];
    if (item.group && previousGroup && item.group !== previousGroup) {
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
