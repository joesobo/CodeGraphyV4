import { builtInItem, separator } from '../common/entryFactories';
import type { GraphContextMenuEntry } from '../contracts';

export function buildBackgroundEntries(timelineActive: boolean): GraphContextMenuEntry[] {
  const entries: GraphContextMenuEntry[] = [];
  if (!timelineActive) {
    entries.push(builtInItem('background-create-file', 'New File...', 'createFile'));
    entries.push(separator('background-separator-primary'));
  }
  entries.push(
    builtInItem('background-refresh', 'Refresh', 'refresh'),
    builtInItem('background-fit', 'Fit All Nodes', 'fitView')
  );
  return entries;
}
