export type { FitBounds2d } from './bounds';
export {
  DEPTH_VIEW_BOTTOM_PADDING_2D,
  FIT_VIEW_SCREEN_PADDING_2D,
  get2dFitBounds,
} from './bounds';
export { getMeasuredSize } from './measurement';
export {
  MIN_FIT_VIEW_PADDING,
  getFitViewPadding,
} from './padding';
export type { FitTransform2d } from './transform';
export { get2dFitTransform } from './transform';
import type { FGNode } from '../../model/build';

export interface GraphView2dControls {
  centerAt(x: number, y: number, durationMs?: number): void;
  zoom(scale: number, durationMs?: number): void;
  zoom(): number;
  zoomToFit(durationMs?: number, padding?: number): void;
}

export interface GraphView3dControls {
  zoomToFit(
    durationMs?: number,
    padding?: number,
    filter?: (candidate: unknown) => boolean,
  ): void;
}

export type { FGNode };
