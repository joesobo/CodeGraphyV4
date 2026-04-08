import type { FGNode } from '../model/build';
import {
  DEPTH_VIEW_BOTTOM_PADDING_2D,
  DEPTH_VIEW_ID,
  FIT_VIEW_SCREEN_PADDING_2D,
  get2dFitBounds,
} from './fitBounds';
import { getMeasuredSize } from './fitMeasurement';

export interface FitTransform2d {
  centerX: number;
  centerY: number;
  zoom: number;
}

export function get2dFitTransform(
  container: HTMLDivElement | null,
  nodes: FGNode[],
  activeViewId: string,
): FitTransform2d | null {
  const width = getMeasuredSize(container, 'clientWidth');
  const height = getMeasuredSize(container, 'clientHeight');
  if (width <= 0 || height <= 0) {
    return null;
  }

  const bounds = get2dFitBounds(nodes);
  if (!bounds) {
    return null;
  }

  const topPadding = FIT_VIEW_SCREEN_PADDING_2D;
  const bottomPadding = activeViewId === DEPTH_VIEW_ID
    ? DEPTH_VIEW_BOTTOM_PADDING_2D
    : FIT_VIEW_SCREEN_PADDING_2D;

  const graphWidth = Math.max(bounds.maxX - bounds.minX, 1);
  const graphHeight = Math.max(bounds.maxY - bounds.minY, 1);
  const availableWidth = Math.max(width - (FIT_VIEW_SCREEN_PADDING_2D * 2), 1);
  const availableHeight = Math.max(height - topPadding - bottomPadding, 1);
  const zoom = Math.min(availableWidth / graphWidth, availableHeight / graphHeight);
  const screenOffsetY = (topPadding - bottomPadding) / 2;

  return {
    centerX: (bounds.minX + bounds.maxX) / 2,
    centerY: ((bounds.minY + bounds.maxY) / 2) - (screenOffsetY / zoom),
    zoom,
  };
}
