import { builtInItem, separator } from '../../common/entryFactories';
import type { GraphContextMenuEntry } from '../../contracts';

export function buildFolderDestructiveEntries(): GraphContextMenuEntry[] {
  return [
    separator('node-separator-folder-destructive'),
    builtInItem('node-rename-folder', 'Rename Folder', 'rename', { disabled: false }),
    builtInItem('node-delete-folder', 'Delete Folder', 'delete', { destructive: true, disabled: false }),
  ];
}
