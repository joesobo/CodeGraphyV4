import { builtInItem, separator } from '../common/entryFactories';
import type { GraphContextMenuEntry } from '../contracts';

export function buildBackgroundEntries(): GraphContextMenuEntry[] {
  return [
    builtInItem('background-create-file', 'New File', 'createFile', { disabled: false }),
    builtInItem('background-create-folder', 'New Folder', 'createFolder', { disabled: false }),
    separator('background-separator-primary'),
    builtInItem('background-refresh', 'Refresh', 'refresh'),
    builtInItem('background-fit', 'Fit All Nodes', 'fitView'),
  ];
}
