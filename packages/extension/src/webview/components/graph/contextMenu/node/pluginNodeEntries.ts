import type { GraphContextMenuEntry } from '../contracts';
import { builtInItem } from '../common/entryFactories';

export function buildSinglePluginNodeEntries(): GraphContextMenuEntry[] {
  return [
    builtInItem('node-focus', 'Focus Node', 'focus'),
  ];
}
