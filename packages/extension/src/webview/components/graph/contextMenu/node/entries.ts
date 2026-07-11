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
import { buildNodeClipboardEntries } from './clipboardEntries';
export { buildSingleFolderNodeEntries } from './folderEntries';
export { buildSinglePluginNodeEntries } from './pluginNodeEntries';
export { buildSingleSymbolNodeEntries } from './symbolEntries';

export function buildNodeEntries(
  targets: readonly string[],
  timelineActive: boolean,
  mutationAvailability: GraphContextMutationAvailability,
  favorites: ReadonlySet<string>,
  supportsFileClipboard: boolean,
  compareSelectedPath?: string | null,
): GraphContextMenuEntry[] {
  const entries: GraphContextMenuEntry[] = [
    ...buildOpenBlock(targets, timelineActive, compareSelectedPath),
    ...(supportsFileClipboard
      ? buildNodeClipboardEntries(targets, mutationAvailability, false)
      : []),
    ...buildCopyBlock(targets),
    ...buildFavoriteBlock(targets, favorites),
    ...buildFilterBlock(targets),
  ];

  if (mutationAvailability !== 'hidden') {
    entries.push(...buildDestructiveBlock(targets, mutationAvailability === 'disabled'));
  }

  return entries;
}
