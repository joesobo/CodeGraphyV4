import {
  mdiCogOutline,
  mdiPaletteOutline,
  mdiLinkVariant,
  mdiPuzzleOutline,
  mdiShapeOutline,
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
  'graphScope'
  | 'legends'
  | 'plugins'
  | 'settings';

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

export const GRAPH_TOOL_PANEL_BUTTONS: Array<{ iconPath: string; panel: ToolbarPanel; title: string }> = [
  { iconPath: mdiShapeOutline, panel: 'graphScope', title: 'Graph Scope' },
  { iconPath: mdiPaletteOutline, panel: 'legends', title: 'Legends' },
];

export const SYSTEM_PANEL_BUTTONS: Array<{ iconPath: string; panel: ToolbarPanel; title: string }> = [
  { iconPath: mdiPuzzleOutline, panel: 'plugins', title: 'Plugins' },
  { iconPath: mdiCogOutline, panel: 'settings', title: 'Settings' },
];

export const TOOLBAR_PANEL_BUTTONS = [
  ...GRAPH_TOOL_PANEL_BUTTONS,
  ...SYSTEM_PANEL_BUTTONS,
];
