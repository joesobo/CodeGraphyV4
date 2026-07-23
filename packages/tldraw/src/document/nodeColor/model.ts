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

const COMMON_NODE_COLOR_BY_EXTENSION = {
  '.ts': 'blue',
  '.tsx': 'orange',
  '.js': 'red',
  '.jsx': 'green',
  '.css': 'light-green',
  '.scss': 'light-red',
  '.json': 'violet',
  '.md': 'light-blue',
  '.html': 'yellow',
  '.svg': 'grey',
} satisfies Readonly<Record<string, TLDefaultColorStyle>>;

function fileExtension(nodeId: string): string {
  const normalized = nodeId.replaceAll('\\', '/');
  const basename = normalized.slice(normalized.lastIndexOf('/') + 1).toLowerCase();
  const lastDot = basename.lastIndexOf('.');
  return lastDot < 0 ? '' : basename.slice(lastDot);
}

function extensionHash(extension: string): number {
  let hash = 0;
  for (const character of extension) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash;
}

function nodeColor(nodeId: string): TLDefaultColorStyle {
  const extension = fileExtension(nodeId);
  if (!extension) return 'grey';
  return COMMON_NODE_COLOR_BY_EXTENSION[extension as keyof typeof COMMON_NODE_COLOR_BY_EXTENSION]
    ?? NODE_COLOR_TOKENS[extensionHash(extension) % NODE_COLOR_TOKENS.length]
    ?? 'grey';
}

export function createNodeColorMap(
  nodes: readonly IGraphNode[],
): ReadonlyMap<string, TLDefaultColorStyle> {
  return new Map(nodes.map(node => [node.id, nodeColor(node.id)]));
}
