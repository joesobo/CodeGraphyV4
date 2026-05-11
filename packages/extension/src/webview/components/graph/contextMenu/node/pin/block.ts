import { builtInItem } from '../../common/entryFactories';
import type { GraphContextMenuEntry } from '../../contracts';

export function buildPinBlock(
  targets: readonly string[],
  pinnedNodeIds: ReadonlySet<string>,
): GraphContextMenuEntry[] {
  if (targets.length !== 1) {
    return [];
  }

  const [target] = targets;
  const pinned = pinnedNodeIds.has(target);

  return [
    builtInItem(
      'node-toggle-pin',
      pinned ? 'Unpin Node' : 'Pin Node',
      pinned ? 'unpinNode' : 'pinNode',
    ),
  ];
}
