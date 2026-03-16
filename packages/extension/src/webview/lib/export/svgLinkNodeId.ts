import type { SvgExportLinkNodeRef } from './svgTypes';

export function getLinkNodeId(node: string | number | SvgExportLinkNodeRef | undefined): string | null {
  if (node === undefined) {
    return null;
  }

  if (typeof node === 'number') {
    return String(node);
  }

  if (typeof node === 'string') {
    return node;
  }

  if (node.id === undefined) {
    return null;
  }

  return String(node.id);
}
