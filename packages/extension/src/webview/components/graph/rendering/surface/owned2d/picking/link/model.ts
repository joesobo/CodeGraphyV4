import { resolveGraphLinkGeometry, pointOnGraphLink } from '@codegraphy-dev/graph-renderer';
import type { FGLink } from '../../../../../model/build';
import { collectLinkPickCandidates, indexLinkSegment, type LinkPickBuckets } from './indexState';
import { distanceToOwnedLink } from './metrics';

export { distanceToOwnedLink } from './metrics';

export interface OwnedGraphLinkPick { distance: number; index: number; link: FGLink }

const CURVE_SEGMENTS = 12;

function nearestLink(
  links: readonly FGLink[],
  candidates: ReadonlySet<number>,
  point: { x: number; y: number },
  maximumDistance: number,
): OwnedGraphLinkPick | undefined {
  let nearest: OwnedGraphLinkPick | undefined;
  for (const index of candidates) {
    const distance = distanceToOwnedLink(links[index], point);
    const closer = !nearest || distance < nearest.distance;
    const earlierTie = nearest !== undefined && distance === nearest.distance && index < nearest.index;
    if (distance <= maximumDistance && (closer || earlierTie)) nearest = { distance, index, link: links[index] };
  }
  return nearest;
}

export class OwnedGraphLinkPicker {
  private readonly buckets: LinkPickBuckets = new Map();
  private links: readonly FGLink[] = [];
  private entryCount = 0;

  get indexedEntryCount(): number { return this.entryCount; }

  rebuild(links: readonly FGLink[]): void {
    this.links = links;
    this.buckets.clear();
    this.entryCount = 0;
    links.forEach((link, index) => {
      const geometry = resolveGraphLinkGeometry(link);
      if (!geometry) return;
      let previous = pointOnGraphLink(geometry, 0);
      for (let segment = 1; segment <= CURVE_SEGMENTS; segment += 1) {
        const next = pointOnGraphLink(geometry, segment / CURVE_SEGMENTS);
        this.entryCount += indexLinkSegment(this.buckets, index, previous, next);
        previous = next;
      }
    });
  }

  pick(point: { x: number; y: number }, zoom: number): OwnedGraphLinkPick | undefined {
    const maximumDistance = 6 / Math.max(zoom, 0.0001);
    return nearestLink(this.links, collectLinkPickCandidates(this.buckets, point, maximumDistance), point, maximumDistance);
  }
}
