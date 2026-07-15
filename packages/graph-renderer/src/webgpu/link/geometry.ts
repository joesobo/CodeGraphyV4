import type { GraphRendererLink, GraphRendererNode } from '../../contracts';

export const GRAPH_SELF_LOOP_RADIUS = 70;

export interface GraphLinkGeometry {
  controlX: number;
  controlY: number;
  secondControlX?: number;
  secondControlY?: number;
  source: GraphRendererNode;
  target: GraphRendererNode;
}

export function resolveGraphLinkGeometry(
  link: GraphRendererLink,
): GraphLinkGeometry | undefined {
  if (!link.source || !link.target) return undefined;
  if (typeof link.source === 'string' || typeof link.target === 'string') return undefined;
  const source = link.source;
  const target = link.target;
  if (![source.x, source.y, target.x, target.y].every(Number.isFinite)) return undefined;
  const dx = (target.x as number) - (source.x as number);
  const dy = (target.y as number) - (source.y as number);
  const distance = Math.hypot(dx, dy);
  const curvature = link.curvature ?? 0;
  if (distance === 0) {
    const radius = Math.max(0.5, Math.abs(curvature)) * GRAPH_SELF_LOOP_RADIUS;
    return {
      source,
      target,
      controlX: (source.x as number),
      controlY: (source.y as number) - radius,
      secondControlX: (source.x as number) + radius,
      secondControlY: (source.y as number),
    };
  }
  const offset = distance * curvature;
  return {
    source,
    target,
    controlX: ((source.x as number) + (target.x as number)) / 2 + (dy / distance) * offset,
    controlY: ((source.y as number) + (target.y as number)) / 2 - (dx / distance) * offset,
  };
}
