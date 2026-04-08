import { builtInItem, separator } from '../common/entryFactories';
import type { GraphContextMenuEntry } from '../contracts';
import {
  areOnlyPackageNodes,
  buildCopyRelativeLabel,
  buildOpenBlockLabel,
  shouldShowAbsoluteCopy,
  shouldShowRevealInExplorer,
} from './targets';

/** Builds the "open" block: Open File/Files and optionally Reveal in Explorer. */
export function buildOpenBlock(
  targets: readonly string[],
  timelineActive: boolean
): GraphContextMenuEntry[] {
  if (areOnlyPackageNodes(targets)) {
    return [];
  }

  const entries: GraphContextMenuEntry[] = [];

  entries.push(
    builtInItem('node-open', buildOpenBlockLabel(targets), 'open')
  );

  if (shouldShowRevealInExplorer(targets, timelineActive)) {
    entries.push(builtInItem('node-reveal', 'Reveal in Explorer', 'reveal'));
  }

  return entries;
}

/** Builds the "copy" block: Copy Relative Path and optionally Copy Absolute Path. */
export function buildCopyBlock(targets: readonly string[]): GraphContextMenuEntry[] {
  if (areOnlyPackageNodes(targets)) {
    return [];
  }

  const entries: GraphContextMenuEntry[] = [];

  entries.push(separator('node-separator-copy'));
  entries.push(
    builtInItem(
      'node-copy-relative',
      buildCopyRelativeLabel(targets),
      'copyRelative'
    )
  );

  if (shouldShowAbsoluteCopy(targets)) {
    entries.push(builtInItem('node-copy-absolute', 'Copy Absolute Path', 'copyAbsolute'));
  }

  return entries;
}
