import type {
  BuiltInContextMenuAction,
  GraphContextMenuEntry,
} from '../../../../src/webview/components/graph/contextMenu/contracts';

export function menuItems(
  entries: GraphContextMenuEntry[],
): Extract<GraphContextMenuEntry, { kind: 'item' }>[] {
  return entries.filter(entry => entry.kind === 'item');
}

export function menuLabels(entries: GraphContextMenuEntry[]): string[] {
  return menuItems(entries).map(entry => entry.label);
}

export function builtInActions(entries: GraphContextMenuEntry[]): BuiltInContextMenuAction[] {
  const actions: BuiltInContextMenuAction[] = [];
  for (const entry of menuItems(entries)) {
    if (entry.action.kind === 'builtin') actions.push(entry.action.action);
  }
  return actions;
}
