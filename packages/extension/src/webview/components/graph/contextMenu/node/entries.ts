import type { GraphContextMenuEntry } from '../contracts';
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
  favorites: ReadonlySet<string>,
): GraphContextMenuEntry[] {
  return [
    ...buildOpenBlock(targets),
    ...buildCopyBlock(targets),
    ...buildFavoriteBlock(targets, favorites),
    ...buildFilterBlock(targets),
    ...buildDestructiveBlock(targets),
  ];
}
