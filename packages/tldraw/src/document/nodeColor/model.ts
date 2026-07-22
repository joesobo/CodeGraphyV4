import type { IGraphNode } from '@codegraphy-dev/core';
import { FILE_TYPE_COLORS } from '@codegraphy-dev/core/file-colors';
import type { TLDefaultColorStyle } from '@tldraw/tlschema';

export const NODE_COLOR_TOKENS = [
  'blue',
  'orange',
  'red',
  'green',
  'light-green',
  'light-red',
  'violet',
  'light-blue',
  'yellow',
  'grey',
] satisfies readonly TLDefaultColorStyle[];

const CORE_FILE_COLORS: readonly string[] = [...new Set(Object.values(FILE_TYPE_COLORS))];
const NATIVE_COLOR_BY_CORE_COLOR = new Map<string, TLDefaultColorStyle>(
  CORE_FILE_COLORS.map((color, index) => [
    color.toUpperCase(),
    NODE_COLOR_TOKENS[index % NODE_COLOR_TOKENS.length] ?? 'grey',
  ]),
);

export function createNodeColorMap(
  nodes: readonly IGraphNode[],
): ReadonlyMap<string, TLDefaultColorStyle> {
  return new Map(nodes.map(node => [
    node.id,
    NATIVE_COLOR_BY_CORE_COLOR.get(node.color.toUpperCase()) ?? 'grey',
  ]));
}
