export type { FitBounds2d } from '../bounds';
export {
  DEPTH_VIEW_BOTTOM_PADDING_2D,
  FIT_VIEW_SCREEN_PADDING_2D,
  get2dFitBounds,
} from '../bounds';
export { getMeasuredSize } from '../measurement';
export {
  MIN_FIT_VIEW_PADDING,
  getFitViewPadding,
} from '../padding';
export type { FitTransform2d } from '../transform';
export { get2dFitTransform } from '../transform';
import type { FGNode } from '../../../model/build';

export interface GraphView2dControls {
  centerAt(x: number, y: number, durationMs?: number): void;
  zoom(scale: number, durationMs?: number): void;
  zoom(): number;
  zoomToFit(durationMs?: number, padding?: number): void;
}

export interface GraphView3dCoords {
  x: number;
  y: number;
  z: number;
}

export interface GraphView3dBounds {
  x: [number, number];
  y: [number, number];
  z: [number, number];
}

export interface GraphView3dControls {
  camera(): { position: GraphView3dCoords };
  cameraPosition(
    position: Partial<GraphView3dCoords>,
    lookAt?: GraphView3dCoords,
    durationMs?: number,
  ): void;
  controls(): { target?: GraphView3dCoords };
  getGraphBbox(): GraphView3dBounds | null | undefined;
  zoomToFit(
    durationMs?: number,
    padding?: number,
    filter?: (candidate: unknown) => boolean,
  ): void;
}

export type { FGNode };
