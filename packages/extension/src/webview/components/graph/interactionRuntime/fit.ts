export type { FitBounds2d } from './fitBounds';
export {
  DEPTH_VIEW_BOTTOM_PADDING_2D,
  FIT_VIEW_SCREEN_PADDING_2D,
  get2dFitBounds,
} from './fitBounds';
export { getMeasuredSize } from './fitMeasurement';
export {
  MIN_FIT_VIEW_PADDING,
  getFitViewPadding,
} from './fitPadding';
export type { FitTransform2d } from './fitTransform';
export { get2dFitTransform } from './fitTransform';
import type { FGNode } from '../model/build';

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
