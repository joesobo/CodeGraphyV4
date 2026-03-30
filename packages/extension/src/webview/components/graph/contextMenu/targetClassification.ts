import type { IPluginContextMenuItem } from '../../../../shared/plugins/contextMenu';
import type { GraphContextSelection } from './contracts';

export interface ClassifiedTarget {
  targetId: string;
  targetType: 'node' | 'edge';
  eligibleItems: IPluginContextMenuItem[];
}

/**
 * Determines the target id, target type, and eligible plugin items for the given selection.
 * Returns null when the selection does not qualify for plugin context menu items
 * (e.g. multi-select node or background click).
 */
export function classifyTarget(
  selection: GraphContextSelection,
  pluginItems: readonly IPluginContextMenuItem[]
): ClassifiedTarget | null {
  if (selection.kind === 'node' && selection.targets.length === 1) {
    const targetId = selection.targets[0];
    const eligibleItems = pluginItems.filter(item => item.when === 'node' || item.when === 'both');
    return { targetId, targetType: 'node', eligibleItems };
  }

  if (selection.kind === 'edge' && selection.edgeId) {
    const targetId = selection.edgeId;
    const eligibleItems = pluginItems.filter(item => item.when === 'edge' || item.when === 'both');
    return { targetId, targetType: 'edge', eligibleItems };
  }

  return null;
}
