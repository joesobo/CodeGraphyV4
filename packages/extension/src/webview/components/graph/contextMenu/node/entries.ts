import type { GraphContextMenuEntry } from '../contracts';
import {
  buildOpenBlock,
  buildCopyBlock,
} from './openCopyBlocks';
import { buildFavoriteBlock } from './favoritesDestructiveBlocks';
import { buildDestructiveBlock } from './destructiveBlock';

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
