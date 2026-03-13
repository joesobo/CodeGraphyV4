import { builtInItem } from './entryFactories';
import type { GraphContextMenuEntry } from './types';

export function buildEdgeEntries(targets: readonly string[]): GraphContextMenuEntry[] {
  const [sourceId, targetId] = targets;
  const entries: GraphContextMenuEntry[] = [];

  if (sourceId) {
    entries.push(builtInItem('edge-copy-source', 'Copy Source Path', 'copyEdgeSource'));
  }
  if (targetId) {
    entries.push(builtInItem('edge-copy-target', 'Copy Target Path', 'copyEdgeTarget'));
  }
  if (sourceId && targetId) {
    entries.push(builtInItem('edge-copy-both', 'Copy Both Paths', 'copyEdgeBoth'));
  }

  return entries;
}
