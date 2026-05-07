import { builtInItem, separator } from '../common/entryFactories';
import type { GraphContextMenuEntry, GraphContextMutationAvailability } from '../contracts';

export function buildBackgroundEntries(
  mutationAvailability: GraphContextMutationAvailability,
  options: { includeGraphSection?: boolean } = {},
): GraphContextMenuEntry[] {
  const entries: GraphContextMenuEntry[] = [];
  if (mutationAvailability !== 'hidden') {
    const disabled = mutationAvailability === 'disabled';
    if (options.includeGraphSection !== false) {
      entries.push(builtInItem('background-create-section', 'New Graph Section', 'createGraphSection', { disabled }));
    }
    entries.push(builtInItem('background-create-file', 'New File...', 'createFile', { disabled }));
    entries.push(builtInItem('background-create-folder', 'New Folder...', 'createFolder', { disabled }));
    entries.push(separator('background-separator-primary'));
  }
  entries.push(
    builtInItem('background-refresh', 'Refresh', 'refresh'),
    builtInItem('background-fit', 'Fit All Nodes', 'fitView')
  );
  return entries;
}
