import type { GraphInteractionHandlersDependencies } from './handlers';
import type { FGNode } from '../model/build';

const MIN_FIT_VIEW_PADDING = 20;
const FIT_VIEW_SCREEN_PADDING_2D = 40;
const DEPTH_VIEW_ID = 'codegraphy.depth-graph';
const DEPTH_VIEW_BOTTOM_PADDING_2D = 104;

interface GraphView2dControls {
  centerAt(x: number, y: number, durationMs?: number): void;
  zoom(scale: number, durationMs?: number): void;
  zoom(): number;
  zoomToFit(durationMs?: number, padding?: number): void;
}

interface GraphView3dControls {
  zoomToFit(
    durationMs?: number,
    padding?: number,
    filter?: (candidate: unknown) => boolean,
  ): void;
}

export interface ViewHandlers {
  fitView(this: void): void;
  focusNodeById(this: void, nodeId: string): void;
  updateAccessCount(this: void, nodeId: string, accessCount: number): void;
  zoom2d(this: void, factor: number): void;
}

interface FitTransform2d {
  centerX: number;
  centerY: number;
  zoom: number;
}

function getFitViewPadding(nodes: FGNode[]): number {
  let maxNodeSize = 0;

  for (const node of nodes) {
    if (typeof node.size === 'number' && Number.isFinite(node.size)) {
      maxNodeSize = Math.max(maxNodeSize, node.size);
    }
  }

  if (maxNodeSize === 0) {
    return MIN_FIT_VIEW_PADDING;
  }

  return Math.ceil((maxNodeSize * 3) + MIN_FIT_VIEW_PADDING);
}

function getMeasuredSize(element: HTMLDivElement | null, key: 'clientWidth' | 'clientHeight'): number {
  if (!element) return 0;
  const measured = element[key];
  return Number.isFinite(measured) ? measured : 0;
}

function get2dFitTransform(
  container: HTMLDivElement | null,
  nodes: FGNode[],
  activeViewId: string,
): FitTransform2d | null {
  const width = getMeasuredSize(container, 'clientWidth');
  const height = getMeasuredSize(container, 'clientHeight');
  if (width <= 0 || height <= 0) {
    return null;
  }
  const topPadding = FIT_VIEW_SCREEN_PADDING_2D;
  const rightPadding = FIT_VIEW_SCREEN_PADDING_2D;
  const leftPadding = FIT_VIEW_SCREEN_PADDING_2D;
  const bottomPadding = activeViewId === DEPTH_VIEW_ID
    ? DEPTH_VIEW_BOTTOM_PADDING_2D
    : FIT_VIEW_SCREEN_PADDING_2D;

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const node of nodes) {
    const x = node.x;
    const y = node.y;
    if (typeof x !== 'number' || !Number.isFinite(x) || typeof y !== 'number' || !Number.isFinite(y)) {
      continue;
    }

    const radius = typeof node.size === 'number' && Number.isFinite(node.size) ? node.size : 16;
    minX = Math.min(minX, x - radius);
    maxX = Math.max(maxX, x + radius);
    minY = Math.min(minY, y - radius);
    maxY = Math.max(maxY, y + radius);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
    return null;
  }

  const graphWidth = Math.max(maxX - minX, 1);
  const graphHeight = Math.max(maxY - minY, 1);
  const availableWidth = Math.max(width - leftPadding - rightPadding, 1);
  const availableHeight = Math.max(height - topPadding - bottomPadding, 1);
  const zoom = Math.min(availableWidth / graphWidth, availableHeight / graphHeight);
  const screenOffsetX = (leftPadding - rightPadding) / 2;
  const screenOffsetY = (topPadding - bottomPadding) / 2;

  return {
    centerX: ((minX + maxX) / 2) - (screenOffsetX / zoom),
    centerY: ((minY + maxY) / 2) - (screenOffsetY / zoom),
    zoom,
  };
}

export function createViewHandlers(
  dependencies: GraphInteractionHandlersDependencies,
): ViewHandlers {
  const focusNodeById = (nodeId: string): void => {
    const node = dependencies.graphDataRef.current.nodes.find(
      (candidate) => candidate.id === nodeId,
    );
    if (!node) return;

    if (dependencies.graphMode === '2d') {
      const graph2d = dependencies.fg2dRef.current as GraphView2dControls | undefined;
      graph2d?.centerAt(node.x ?? 0, node.y ?? 0, 300);
      graph2d?.zoom(1.5, 300);
      return;
    }

    (dependencies.fg3dRef.current as GraphView3dControls | undefined)?.zoomToFit(
      300,
      20,
      (candidate) => (candidate as FGNode).id === nodeId,
    );
  };

  const fitView = (): void => {
    const padding = getFitViewPadding(dependencies.graphDataRef.current.nodes);

    if (dependencies.graphMode === '2d') {
      const graph2d = dependencies.fg2dRef.current as GraphView2dControls | undefined;
      const transform = get2dFitTransform(
        dependencies.containerRef.current,
        dependencies.graphDataRef.current.nodes,
        dependencies.activeViewId,
      );

      if (transform) {
        graph2d?.centerAt(transform.centerX, transform.centerY, 300);
        graph2d?.zoom(transform.zoom, 300);
        return;
      }

      graph2d?.zoomToFit(300, padding);
      return;
    }

    (dependencies.fg3dRef.current as GraphView3dControls | undefined)?.zoomToFit(300, padding);
  };

  const zoom2d = (factor: number): void => {
    const forceGraph = dependencies.fg2dRef.current as GraphView2dControls | undefined;
    if (!forceGraph) return;

    const currentZoom = forceGraph.zoom();
    forceGraph.zoom(currentZoom * factor, 150);
  };

  const updateAccessCount = (nodeId: string, accessCount: number): void => {
    const node = dependencies.dataRef.current.nodes.find((candidate) => candidate.id === nodeId);
    if (node) {
      node.accessCount = accessCount;
    }
  };

  return {
    fitView,
    focusNodeById,
    updateAccessCount,
    zoom2d,
  };
}
