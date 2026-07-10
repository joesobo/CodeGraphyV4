export interface GraphDebugSnapshot {
  containerHeight: number;
  containerWidth: number;
  graphMode: '2d' | '3d';
  nodes: Array<{
    baseOpacity?: number;
    color?: string;
    id: string;
    imageUrl?: string;
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

export interface GraphDebugControls {
  graph2ScreenCoords?(this: void, x: number, y: number, z?: number): { x: number; y: number };
  zoom?(this: void): number;
  zoomToFit?(this: void, durationMs?: number, padding?: number): void;
}

export interface GraphDebugApi {
  clearRenderedFrameTimes(this: void): void;
  fitView(this: void): void;
  fitViewWithPadding(this: void, padding: number): void;
  getNodeScreenPosition(this: void, nodeId: string): { x: number; y: number } | null;
  getRenderedFrameTimes(this: void): number[];
  getSnapshot(this: void): GraphDebugSnapshot;
  openNodeContextMenu(this: void, nodeId: string): void;
  recordRenderedFrame(this: void, timestamp: number): void;
}
