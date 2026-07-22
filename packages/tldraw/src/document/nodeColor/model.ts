import type { IGraphNode } from '@codegraphy-dev/core';
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

export function nodeExtensionGroup(nodeId: string): string {
  const normalized = nodeId.replaceAll('\\', '/');
  const basename = normalized.slice(normalized.lastIndexOf('/') + 1).toLowerCase();
  const lastDot = basename.lastIndexOf('.');
  if (lastDot === 0) return basename;
  if (lastDot < 0) return '[no extension]';
  return basename.slice(lastDot);
}

export function createNodeColorMap(
  nodes: readonly IGraphNode[],
): ReadonlyMap<string, TLDefaultColorStyle> {
  const groups = [...new Set(nodes.map(node => nodeExtensionGroup(node.id)))].sort();
  const colorsByGroup = new Map<string, TLDefaultColorStyle>(
    groups.map((group, index) => [group, NODE_COLOR_TOKENS[index % NODE_COLOR_TOKENS.length]]),
  );
  return new Map(nodes.map(node => [
    node.id,
    colorsByGroup.get(nodeExtensionGroup(node.id)) ?? 'grey',
  ]));
}
