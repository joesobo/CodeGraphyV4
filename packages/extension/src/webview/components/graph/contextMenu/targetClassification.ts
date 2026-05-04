import type { IPluginContextMenuItem } from '../../../../shared/plugins/contextMenu';
import type { GraphContextSelection } from './contracts';
import { decideGraphContextMenu } from './decision/model';
import type { GraphContextMenuDecision } from './decision/model';

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
  return classifyPluginTarget(decideGraphContextMenu(selection), pluginItems);
}

export function classifyPluginTarget(
  decision: GraphContextMenuDecision,
  pluginItems: readonly IPluginContextMenuItem[]
): ClassifiedTarget | null {
  if (
    decision.kind === 'singleFileNode'
    || decision.kind === 'singleFolderNode'
    || decision.kind === 'singlePackageNode'
    || decision.kind === 'singlePluginNode'
  ) {
    const eligibleItems = pluginItems.filter(item => item.when === 'node' || item.when === 'both');
    return { targetId: decision.target.id, targetType: 'node', eligibleItems };
  }

  if (decision.kind === 'edge' && decision.edgeId) {
    const eligibleItems = pluginItems.filter(item => item.when === 'edge' || item.when === 'both');
    return { targetId: decision.edgeId, targetType: 'edge', eligibleItems };
  }

  return null;
}
