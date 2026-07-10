import type { GraphContextMenuEntry, GraphContextMutationAvailability } from '../contracts';
import {
  buildOpenBlock,
  buildCopyBlock,
} from './openCopyBlocks';
import { buildFavoriteBlock } from './destructive/favoritesBlocks';
import {
  buildDestructiveBlock,
  buildFilterBlock,
} from './destructive/block';
export { buildSingleFolderNodeEntries } from './folderEntries';
export { buildSinglePluginNodeEntries } from './pluginNodeEntries';
export { buildSingleSymbolNodeEntries } from './symbolEntries';

export function buildNodeEntries(
  targets: readonly string[],
  mutationAvailability: GraphContextMutationAvailability,
  favorites: ReadonlySet<string>,
): GraphContextMenuEntry[] {
  const entries: GraphContextMenuEntry[] = [
    ...buildOpenBlock(targets),
    ...buildCopyBlock(targets),
    ...buildFavoriteBlock(targets, favorites),
    ...buildFilterBlock(targets),
  ];

  if (mutationAvailability !== 'hidden') {
    entries.push(...buildDestructiveBlock(targets, mutationAvailability === 'disabled'));
  }

  return entries;
}
