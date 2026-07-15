import type { OwnedGraph2dControls } from '../../rendering/surface/owned2d/contracts';

export interface GraphDebugSnapshot {
  containerHeight: number;
  containerWidth: number;
  fps: number | null;
  nodes: Array<{
    baseOpacity?: number;
    collisionRadius: number;
    color?: string;
    id: string;
    imageUrl?: string;
    positionFinite: boolean;
    screenX: number;
    shapeSize2D?: {
      height: number;
      width: number;
    };
    screenY: number;
    size: number;
    x: number;
    y: number;
  }>;
  zoom: number | null;
}

export type GraphDebugControls = Partial<Pick<
  OwnedGraph2dControls,
  | 'centerAt'
  | 'getFps'
  | 'graph2ScreenCoords'
  | 'zoom'
  | 'zoomToFit'
>>;

export interface GraphDebugApi {
  centerNode(this: void, nodeId: string, scale: number): boolean;
  fitView(this: void): void;
  fitViewWithPadding(this: void, padding: number): void;
  getNodeScreenPosition(this: void, nodeId: string): { x: number; y: number } | null;
  getSnapshot(this: void): GraphDebugSnapshot;
  openNodeContextMenu(this: void, nodeId: string): void;
}
