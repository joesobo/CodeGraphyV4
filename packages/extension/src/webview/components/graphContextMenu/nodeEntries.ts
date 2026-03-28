import type { GraphContextMenuEntry } from './types';
import {
  buildOpenBlock,
  buildCopyBlock,
  buildFavoriteBlock,
  buildDestructiveBlock,
} from './nodeActionBlocks';

export function buildNodeEntries(
  targets: readonly string[],
  timelineActive: boolean,
  favorites: ReadonlySet<string>
): GraphContextMenuEntry[] {
  const entries: GraphContextMenuEntry[] = [
    ...buildOpenBlock(targets, timelineActive),
    ...buildCopyBlock(targets),
    ...buildFavoriteBlock(targets, favorites),
  ];

  if (!timelineActive) {
    entries.push(...buildDestructiveBlock(targets));
  }

  return entries;
}
