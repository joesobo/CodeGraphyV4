import { DEFAULT_DIRECTION_COLOR } from '../../../shared/types';
import type { SvgExportLink, SvgExportLinkNodeRef, SvgPosition } from './exportSvgTypes';

function getLinkNodeId(node: string | number | SvgExportLinkNodeRef | undefined): string | null {
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

function buildLinkElement(link: SvgExportLink, from: SvgPosition, to: SvgPosition, showArrows: boolean): string {
  const color = link.baseColor ?? DEFAULT_DIRECTION_COLOR;
  const strokeWidth = link.bidirectional ? 2 : 1;
  const markerAttr = showArrows ? ' marker-end="url(#arrowhead)"' : '';
  const curvature = link.curvature ?? 0;

  if (Math.abs(curvature) > 0.001) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const cx = (from.x + to.x) / 2 - curvature * dy;
    const cy = (from.y + to.y) / 2 + curvature * dx;
    return `<path d="M${from.x},${from.y} Q${cx},${cy} ${to.x},${to.y}" fill="none" stroke="${color}" stroke-width="${strokeWidth}"${markerAttr}/>`;
  }

  return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${color}" stroke-width="${strokeWidth}"${markerAttr}/>`;
}

export function appendLinkElements(
  parts: string[],
  links: SvgExportLink[],
  positionMap: Map<string, SvgPosition>,
  showArrows: boolean
): void {
  for (const link of links) {
    const sourceId = getLinkNodeId(link.source);
    const targetId = getLinkNodeId(link.target);
    if (sourceId === null || targetId === null) {
      continue;
    }

    const from = positionMap.get(sourceId);
    const to = positionMap.get(targetId);
    if (!from || !to) {
      continue;
    }

    parts.push(buildLinkElement(link, from, to, showArrows));
  }
}
