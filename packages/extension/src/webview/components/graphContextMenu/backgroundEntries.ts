import type { GraphContextMenuEntry } from './types';

export function buildBackgroundEntries(timelineActive: boolean): GraphContextMenuEntry[] {
  const entries: GraphContextMenuEntry[] = [];
  if (!timelineActive) {
    entries.push({
      kind: 'item',
      id: 'background-create-file',
      label: 'New File...',
      action: { kind: 'builtin', action: 'createFile' },
    });
    entries.push({ kind: 'separator', id: 'background-separator-primary' });
  }
  entries.push(
    {
      kind: 'item',
      id: 'background-refresh',
      label: 'Refresh Graph',
      action: { kind: 'builtin', action: 'refresh' },
    },
    {
      kind: 'item',
      id: 'background-fit',
      label: 'Fit All Nodes',
      shortcut: '0',
      action: { kind: 'builtin', action: 'fitView' },
    }
  );
  return entries;
}
