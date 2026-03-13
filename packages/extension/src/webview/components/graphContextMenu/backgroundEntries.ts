import { builtInItem, separator } from './entryFactories';
import type { GraphContextMenuEntry } from './types';

export function buildBackgroundEntries(timelineActive: boolean): GraphContextMenuEntry[] {
  const entries: GraphContextMenuEntry[] = [];
  if (!timelineActive) {
    entries.push(builtInItem('background-create-file', 'New File...', 'createFile'));
    entries.push(separator('background-separator-primary'));
  }
  entries.push(
    builtInItem('background-refresh', 'Refresh Graph', 'refresh'),
    builtInItem('background-fit', 'Fit All Nodes', 'fitView')
  );
  return entries;
}
