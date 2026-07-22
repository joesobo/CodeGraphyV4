import type { TLDefaultColorStyle } from '@tldraw/tlschema';

const NATIVE_COLORS_BY_GRAPH_COLOR: Readonly<Record<string, TLDefaultColorStyle>> = {
  '#67E8F9': 'light-blue',
  '#86EFAC': 'light-green',
  '#93C5FD': 'blue',
  '#A1A1AA': 'grey',
  '#C4B5FD': 'light-violet',
  '#CBD5E1': 'grey',
  '#E879F9': 'violet',
  '#F59E0B': 'orange',
  '#F9A8D4': 'light-red',
  '#FCA5A5': 'red',
  '#FDBA74': 'orange',
  '#FDE68A': 'yellow',
};

export function resolveNativeNodeColor(graphColor: string): TLDefaultColorStyle {
  return NATIVE_COLORS_BY_GRAPH_COLOR[graphColor.toUpperCase()] ?? 'grey';
}
