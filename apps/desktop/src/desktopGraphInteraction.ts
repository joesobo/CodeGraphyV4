import {
  graphNodeWorldScale,
  type GraphRendererCamera,
} from '@codegraphy-dev/graph-renderer';

export const DESKTOP_GRAPH_DRAG_THRESHOLD_PX = 3;
export const DESKTOP_GRAPH_HOVER_SCALE = 1.1;
export const DESKTOP_GRAPH_MIN_ZOOM = 0.05;
export const DESKTOP_GRAPH_MAX_ZOOM = 5;

export function screenToDesktopGraph(
  camera: GraphRendererCamera,
  width: number,
  height: number,
  x: number,
  y: number,
): { x: number; y: number } {
  return {
    x: camera.centerX + (x - width / 2) / camera.zoom,
    y: camera.centerY + (y - height / 2) / camera.zoom,
  };
}

export function zoomDesktopGraphAtPointer(
  camera: GraphRendererCamera,
  width: number,
  height: number,
  pointerX: number,
  pointerY: number,
  deltaY: number,
): GraphRendererCamera {
  const world = screenToDesktopGraph(camera, width, height, pointerX, pointerY);
  const zoom = Math.min(
    DESKTOP_GRAPH_MAX_ZOOM,
    Math.max(DESKTOP_GRAPH_MIN_ZOOM, camera.zoom * Math.exp(-deltaY * 0.0015)),
  );
  return {
    centerX: world.x - (pointerX - width / 2) / zoom,
    centerY: world.y - (pointerY - height / 2) / zoom,
    zoom,
  };
}

export function zoomDesktopGraphBy(
  camera: GraphRendererCamera,
  factor: number,
): GraphRendererCamera {
  return {
    ...camera,
    zoom: Math.min(
      DESKTOP_GRAPH_MAX_ZOOM,
      Math.max(DESKTOP_GRAPH_MIN_ZOOM, camera.zoom * factor),
    ),
  };
}

export function passedDesktopGraphDragThreshold(
  originX: number,
  originY: number,
  currentX: number,
  currentY: number,
): boolean {
  return Math.hypot(currentX - originX, currentY - originY) > DESKTOP_GRAPH_DRAG_THRESHOLD_PX;
}

export function pickDesktopGraphNode(
  nodeX: Float32Array,
  nodeY: Float32Array,
  nodeSizes: readonly number[],
  point: { x: number; y: number },
  zoom: number,
): number | undefined {
  const safeZoom = Math.max(zoom, 0.01);
  const visualScale = graphNodeWorldScale(safeZoom);
  const screenPadding = 2 / safeZoom;
  const minimumRadius = 4 / safeZoom;
  let match: { distanceSquared: number; index: number } | undefined;
  for (let index = 0; index < nodeSizes.length; index += 1) {
    const x = nodeX[index];
    const y = nodeY[index];
    const size = nodeSizes[index];
    if (x === undefined || y === undefined || size === undefined) continue;
    const deltaX = point.x - x;
    const deltaY = point.y - y;
    const distanceSquared = deltaX * deltaX + deltaY * deltaY;
    const radius = Math.max(minimumRadius, size * visualScale + screenPadding);
    if (distanceSquared <= radius * radius
      && (!match || distanceSquared < match.distanceSquared)) {
      match = { distanceSquared, index };
    }
  }
  return match?.index;
}
