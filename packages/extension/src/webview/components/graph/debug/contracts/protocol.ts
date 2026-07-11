export interface GraphDebugSnapshot {
  containerHeight: number;
  containerWidth: number;
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

export interface GraphDebugControls {
  centerAt?(this: void, x?: number, y?: number, durationMs?: number): void;
  graph2ScreenCoords?(this: void, x: number, y: number): { x: number; y: number };
  zoom?(this: void, scale?: number, durationMs?: number): number;
  zoomToFit?(this: void, durationMs?: number, padding?: number): void;
}

export interface GraphDebugApi {
  centerNode(this: void, nodeId: string, scale: number): boolean;
  fitView(this: void): void;
  fitViewWithPadding(this: void, padding: number): void;
  getNodeScreenPosition(this: void, nodeId: string): { x: number; y: number } | null;
  getSnapshot(this: void): GraphDebugSnapshot;
  openNodeContextMenu(this: void, nodeId: string): void;
  recordRenderedFrame(this: void, timestamp: number): void;
  startRenderedFrameRecording(this: void): void;
  stopRenderedFrameRecording(this: void): number[];
}
