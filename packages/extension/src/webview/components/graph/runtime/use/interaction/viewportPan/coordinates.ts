import type { MarqueePoint } from '../../../../marqueeSelection/model';
import type { GraphRuntime } from '../../state';
import { isFiniteNumber } from '../../../physics/numeric';
import type { ViewportPanDragState } from './state';

export function readViewportPanCenter(
  graph: GraphRuntime['renderer']['fg2dRef']['current'],
  container: HTMLDivElement | null,
): { x: number; y: number } {
  const rect = container?.getBoundingClientRect();
  const center = rect
    ? graph?.screen2GraphCoords?.(rect.width / 2, rect.height / 2)
    : undefined;
  return isFiniteNumber(center?.x) && isFiniteNumber(center?.y)
    ? center
    : { x: 0, y: 0 };
}

export function readViewportPanZoom(
  graph: GraphRuntime['renderer']['fg2dRef']['current'],
): number {
  const zoom = graph?.zoom?.();
  return isFiniteNumber(zoom) && zoom !== 0 ? zoom : 1;
}

export function applyViewportPanDrag(
  drag: ViewportPanDragState,
  current: MarqueePoint,
  graph: GraphRuntime['renderer']['fg2dRef']['current'],
): void {
  graph?.centerAt?.(
    drag.center.x - ((current.x - drag.start.x) / drag.zoom),
    drag.center.y - ((current.y - drag.start.y) / drag.zoom),
    0,
  );
}
