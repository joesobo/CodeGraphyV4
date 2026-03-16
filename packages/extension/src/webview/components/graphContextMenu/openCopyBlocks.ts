import { builtInItem, separator } from './entryFactories';
import type { GraphContextMenuEntry } from './types';

/** Builds the "open" block: Open File/Files and optionally Reveal in Explorer. */
export function buildOpenBlock(
  targets: readonly string[],
  timelineActive: boolean
): GraphContextMenuEntry[] {
  const isMultiSelect = targets.length > 1;
  const entries: GraphContextMenuEntry[] = [];

  entries.push(
    builtInItem('node-open', isMultiSelect ? `Open ${targets.length} Files` : 'Open File', 'open')
  );

  if (!isMultiSelect && !timelineActive) {
    entries.push(builtInItem('node-reveal', 'Reveal in Explorer', 'reveal'));
  }

  return entries;
}

/** Builds the "copy" block: Copy Relative Path and optionally Copy Absolute Path. */
export function buildCopyBlock(targets: readonly string[]): GraphContextMenuEntry[] {
  const isMultiSelect = targets.length > 1;
  const entries: GraphContextMenuEntry[] = [];

  entries.push(separator('node-separator-copy'));
  entries.push(
    builtInItem(
      'node-copy-relative',
      isMultiSelect ? 'Copy Relative Paths' : 'Copy Relative Path',
      'copyRelative'
    )
  );

  if (!isMultiSelect) {
    entries.push(builtInItem('node-copy-absolute', 'Copy Absolute Path', 'copyAbsolute'));
  }

  return entries;
}
