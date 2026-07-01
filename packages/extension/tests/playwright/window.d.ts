interface GraphDebugSnapshot {
  containerHeight: number;
  containerWidth: number;
  graphMode: '2d' | '3d';
  nodes: Array<{
    baseOpacity?: number;
    color?: string;
    id: string;
    imageUrl?: string;
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
    openNodeContextMenu(nodeId: string): void;
  };
}
