import {
  mdiCogOutline,
  mdiExport,
  mdiPaletteOutline,
  mdiLinkVariant,
  mdiPuzzleOutline,
  mdiShapeOutline,
  mdiVectorLine,
} from '@mdi/js';

export interface ToolbarActionItemLike {
  id: string;
  label: string;
  index: number;
}

export interface ToolbarActionLike {
  id: string;
  label: string;
  icon?: string;
  pluginId: string;
  pluginName: string;
  index: number;
  items: ToolbarActionItemLike[];
}

export type ToolbarPanel =
  'nodes'
  | 'edges'
  | 'legends'
  | 'plugins'
  | 'settings'
  | 'export';

export function getToolbarActionKey(action: ToolbarActionLike): string {
  return `${action.pluginId}:${action.id}:${action.index}`;
}

export function getToolbarActionItemKey(
  action: ToolbarActionLike,
  item: ToolbarActionItemLike,
): string {
  return `${action.pluginId}:${action.id}:${item.index}`;
}

export function getToolbarActionIconPath(action: { icon?: string }): string {
  return action.icon ?? mdiLinkVariant;
}

export const TOOLBAR_PANEL_BUTTONS: Array<{ iconPath: string; panel: ToolbarPanel; title: string }> = [
  { iconPath: mdiExport, panel: 'export', title: 'Export' },
  { iconPath: mdiShapeOutline, panel: 'nodes', title: 'Nodes' },
  { iconPath: mdiVectorLine, panel: 'edges', title: 'Edges' },
  { iconPath: mdiPaletteOutline, panel: 'legends', title: 'Legends' },
  { iconPath: mdiPuzzleOutline, panel: 'plugins', title: 'Plugins' },
  { iconPath: mdiCogOutline, panel: 'settings', title: 'Settings' },
];
