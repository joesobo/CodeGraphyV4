import type { FGNode } from '../model/build';

export interface MarqueePoint {
  x: number;
  y: number;
}

export interface MarqueeBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface GetMarqueeSelectedNodeIdsOptions {
  bounds: MarqueeBounds;
  graphToScreen(this: void, x: number, y: number): MarqueePoint;
  nodes: readonly FGNode[];
}

export interface GraphMarqueeSelectionState {
  bounds: MarqueeBounds;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function getMarqueeBounds(start: MarqueePoint, current: MarqueePoint): MarqueeBounds {
  const left = Math.min(start.x, current.x);
  const top = Math.min(start.y, current.y);

  return {
    left,
    top,
    width: Math.abs(current.x - start.x),
    height: Math.abs(current.y - start.y),
  };
}

export function isMarqueePastThreshold(
  start: MarqueePoint,
  current: MarqueePoint,
  thresholdPx: number,
): boolean {
  return Math.hypot(current.x - start.x, current.y - start.y) > thresholdPx;
}

function containsPoint(bounds: MarqueeBounds, point: MarqueePoint): boolean {
  return point.x >= bounds.left
    && point.x <= bounds.left + bounds.width
    && point.y >= bounds.top
    && point.y <= bounds.top + bounds.height;
}

function isSelectableByMarquee(node: FGNode): boolean {
  return !node.isGraphSection || !!node.isCollapsedGraphSection;
}

export function getMarqueeSelectedNodeIds({
  bounds,
  graphToScreen,
  nodes,
}: GetMarqueeSelectedNodeIdsOptions): string[] {
  const selectedNodeIds: string[] = [];

  for (const node of nodes) {
    if (!isSelectableByMarquee(node)) {
      continue;
    }

    if (!isFiniteNumber(node.x) || !isFiniteNumber(node.y)) {
      continue;
    }

    if (containsPoint(bounds, graphToScreen(node.x, node.y))) {
      selectedNodeIds.push(node.id);
    }
  }

  return selectedNodeIds;
}
