import { buildLinkElement } from './exportSvgLinkElement';
import { getLinkNodeId } from './exportSvgLinkNodeId';
import type { SvgExportLink, SvgPosition } from './exportSvgTypes';

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
