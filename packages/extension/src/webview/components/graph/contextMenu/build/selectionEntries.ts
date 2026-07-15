import type { GraphContextMenuEntry, GraphContextSelection } from '../contracts';

export function insertCreateMenuEntries(base: GraphContextMenuEntry[], create: GraphContextMenuEntry[]): GraphContextMenuEntry[] {
  if (create.length === 0) return base;
  const index = base.findIndex(entry => entry.id === 'background-separator-primary');
  return index === -1 ? [...base, ...create] : [...base.slice(0, index), ...create, ...base.slice(index)];
}

export function captureContextSelection(entries: GraphContextMenuEntry[], selection: GraphContextSelection): GraphContextMenuEntry[] {
  const captured = { kind: selection.kind, targets: [...selection.targets],
    ...(selection.edgeId ? { edgeId: selection.edgeId } : {}),
    ...(selection.graphPosition ? { graphPosition: { ...selection.graphPosition } } : {}) } as GraphContextSelection;
  return entries.map(entry => entry.kind === 'item' ? { ...entry, contextSelection: captured } : entry);
}
