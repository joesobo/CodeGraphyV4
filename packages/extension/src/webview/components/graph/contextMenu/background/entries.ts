import { builtInItem, separator } from '../common/entryFactories';
import type { GraphContextMenuEntry, GraphContextMutationAvailability } from '../contracts';

export function buildBackgroundEntries(
  mutationAvailability: GraphContextMutationAvailability,
): GraphContextMenuEntry[] {
  const entries: GraphContextMenuEntry[] = [];
  if (mutationAvailability !== 'hidden') {
    const disabled = mutationAvailability === 'disabled';
    entries.push(builtInItem('background-create-file', 'New File', 'createFile', { disabled }));
    entries.push(builtInItem('background-create-folder', 'New Folder', 'createFolder', { disabled }));
    entries.push(builtInItem('background-paste-files', 'Paste', 'pasteFiles', { disabled }));
    entries.push(separator('background-separator-primary'));
  }
  entries.push(
    builtInItem('background-refresh', 'Refresh', 'refresh'),
    builtInItem('background-fit', 'Fit All Nodes', 'fitView')
  );
  return entries;
}
