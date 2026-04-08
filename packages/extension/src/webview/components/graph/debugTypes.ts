export interface GraphDebugSnapshot {
  containerHeight: number;
  containerWidth: number;
  graphMode: '2d' | '3d';
  nodes: Array<{
    id: string;
    screenX: number;
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
