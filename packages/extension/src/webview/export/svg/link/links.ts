import { buildLinkElement } from './element';
import { getLinkNodeId } from './nodeId';
import type { SvgExportLink, SvgPosition } from '../contracts';

export function appendLinkElements(
  parts: string[],
  links: SvgExportLink[],
  positionMap: Map<string, SvgPosition>,
  showArrows: boolean
): void {
  for (const link of links) {
    const sourceId = getLinkNodeId(link.source);
    const targetId = getLinkNodeId(link.target);
    const from = sourceId === null ? undefined : positionMap.get(sourceId);
    const to = targetId === null ? undefined : positionMap.get(targetId);
    if (!from || !to) {
      continue;
    }

    parts.push(buildLinkElement(link, from, to, showArrows));
  }
}
