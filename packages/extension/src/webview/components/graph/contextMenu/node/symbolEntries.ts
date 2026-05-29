import type { GraphContextMenuEntry } from '../contracts';
import { builtInItem, separator } from '../common/entryFactories';
import { buildFavoriteBlock } from './destructive/favoritesBlocks';

export function buildSingleSymbolNodeEntries(
  target: string,
  favorites: ReadonlySet<string>,
): GraphContextMenuEntry[] {
  const targets = [target];
  return [
    builtInItem('node-go-to-symbol', 'Go to Symbol', 'open'),
    builtInItem('node-reveal-symbol-file', 'Reveal File', 'reveal'),
    separator('node-separator-copy'),
    builtInItem('node-copy-symbol-id', 'Copy Symbol ID', 'copySymbolId'),
    builtInItem('node-copy-symbol-name', 'Copy Symbol Name', 'copySymbolName'),
    ...buildFavoriteBlock(targets, favorites),
  ];
}
