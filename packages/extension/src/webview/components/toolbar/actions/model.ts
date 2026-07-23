import {
  mdiCogOutline,
  mdiPaletteOutline,
  mdiPuzzleOutline,
  mdiShapeOutline,
} from '@mdi/js';

export type ToolbarPanel =
  'graphScope'
  | 'legends'
  | 'plugins'
  | 'settings';

export const GRAPH_TOOL_PANEL_BUTTONS: Array<{ iconPath: string; panel: ToolbarPanel; title: string }> = [
  { iconPath: mdiShapeOutline, panel: 'graphScope', title: 'Graph Scope' },
  { iconPath: mdiPaletteOutline, panel: 'legends', title: 'Themes' },
];

export const SYSTEM_PANEL_BUTTONS: Array<{ iconPath: string; panel: ToolbarPanel; title: string }> = [
  { iconPath: mdiPuzzleOutline, panel: 'plugins', title: 'Plugins' },
  { iconPath: mdiCogOutline, panel: 'settings', title: 'Settings' },
];

export const TOOLBAR_PANEL_BUTTONS = [
  ...GRAPH_TOOL_PANEL_BUTTONS,
  ...SYSTEM_PANEL_BUTTONS,
];
