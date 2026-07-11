import { builtInItem } from '../common/entryFactories';
import type {
  GraphContextMenuEntry,
  GraphContextMutationAvailability,
} from '../contracts';

export function buildNodeClipboardEntries(
  targets: readonly string[],
  mutationAvailability: GraphContextMutationAvailability,
  includePaste: boolean,
): GraphContextMenuEntry[] {
  if (mutationAvailability === 'hidden') return [];

  const disabled = mutationAvailability === 'disabled';
  const entries: GraphContextMenuEntry[] = [];
  if (targets.length > 0) {
    entries.push(
      builtInItem('node-cut-files', 'Cut', 'cutFiles', { disabled }),
      builtInItem('node-copy-files', 'Copy', 'copyFiles', { disabled }),
    );
  }
  if (includePaste) {
    entries.push(builtInItem('node-paste-files', 'Paste', 'pasteFiles', { disabled }));
  }
  return entries;
}
