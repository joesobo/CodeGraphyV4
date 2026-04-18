interface GraphDebugSnapshot {
  containerHeight: number;
  containerWidth: number;
  graphMode: '2d' | '3d';
  nodes: Array<{
    id: string;
    screenX: number;
    screenY: number;
    size: number;
  }>;
  zoom: number | null;
}

interface Window {
  __CODEGRAPHY_GRAPH_DEBUG__?: {
    fitView(): void;
    fitViewWithPadding(padding: number): void;
    getSnapshot(): GraphDebugSnapshot;
  };
}
