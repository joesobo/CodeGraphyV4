import { builtInItem } from '../../common/entryFactories';
import type { GraphContextMenuEntry } from '../../contracts';

export function buildPinBlock(
  targets: readonly string[],
  pinnedNodeIds: ReadonlySet<string>,
): GraphContextMenuEntry[] {
  if (targets.length === 0) {
    return [];
  }

  const pinned = targets.every(target => pinnedNodeIds.has(target));
  const plural = targets.length > 1;

  return [
    builtInItem(
      'node-toggle-pin',
      pinned
        ? (plural ? 'Unpin Nodes' : 'Unpin Node')
        : (plural ? 'Pin Nodes' : 'Pin Node'),
      pinned ? 'unpinNode' : 'pinNode',
    ),
  ];
}
