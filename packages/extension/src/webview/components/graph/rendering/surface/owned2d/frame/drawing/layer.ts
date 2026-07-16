import { createGraphNodeStackingOrder } from '@codegraphy-dev/graph-renderer';
import { canvasSize } from '../../camera/geometry/canvas';
import type { Surface2dProps } from '../../view/surface/contracts';
import { drawOwnedGraphOverlay, type OwnedGraphDrawingOptions } from './overlay';
import type { OwnedGraphFrameRuntime } from '../runtime/render';
import type { OwnedGraphLayout } from '../../layout/runtime/model';

export interface PreparedOverlayCanvas { context: CanvasRenderingContext2D; devicePixelRatio: number; height: number; width: number }

interface CachedNodeStackingOrder {
  getNodeStyle: Surface2dProps['getNodeStyle'];
  order: Uint32Array;
  styleRevision: number;
}

const nodeStackingOrderByNodes = new WeakMap<OwnedGraphLayout['nodes'], CachedNodeStackingOrder>();

export function prepareOwnedOverlayCanvas(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D): PreparedOverlayCanvas {
  const { width, height } = canvasSize(canvas);
  const devicePixelRatio = Math.max(1, window.devicePixelRatio || 1);
  const backingWidth = Math.max(1, Math.round(width * devicePixelRatio));
  const backingHeight = Math.max(1, Math.round(height * devicePixelRatio));
  if (canvas.width !== backingWidth || canvas.height !== backingHeight) { canvas.width = backingWidth; canvas.height = backingHeight; }
  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);
  return { context, devicePixelRatio, height, width };
}

function nodeStackingOrder(
  layout: OwnedGraphLayout,
  props: Surface2dProps,
  styleRevision: number,
): Uint32Array {
  const cached = nodeStackingOrderByNodes.get(layout.nodes);
  if (cached?.getNodeStyle === props.getNodeStyle && cached.styleRevision === styleRevision) {
    return cached.order;
  }
  const order = createGraphNodeStackingOrder(layout.nodes.map(node => props.getNodeStyle(node)));
  nodeStackingOrderByNodes.set(layout.nodes, { getNodeStyle: props.getNodeStyle, order, styleRevision });
  return order;
}

function hoveredNodeIndex(runtime: OwnedGraphFrameRuntime, layout: OwnedGraphLayout): number {
  const nodeId = runtime.nodeHoverRef.current.nodeId;
  if (nodeId === null) return -1;
  const index = layout.engine.getNodeIndex(nodeId);
  return index === undefined || index < 0 ? -1 : index;
}

function drawingOptions(runtime: OwnedGraphFrameRuntime, layout: OwnedGraphLayout, prepared: PreparedOverlayCanvas, timestamp: number): OwnedGraphDrawingOptions {
  const props = runtime.propsRef.current; const camera = runtime.cameraRef.current;
  const styleRevision = props.getStyleRevision();
  return {
    context: prepared.context, directionMode: props.directionMode, getLinkParticles: props.getLinkParticles,
    getParticleColor: props.getParticleColor, globalScale: camera.zoom,
    hoveredNodeIndex: hoveredNodeIndex(runtime, layout), hoveredNodeScale: runtime.nodeHoverRef.current.scale,
    links: layout.links, nodes: layout.nodes, nodeIndexByRenderedIndex: nodeStackingOrder(layout, props, styleRevision),
    nodeLabelCanvasObject: props.nodeLabelCanvasObject, particleSize: props.particleSize,
    particleSpeed: props.particleSpeed, timestamp,
    viewport: { maximumX: camera.centerX + prepared.width / (2 * camera.zoom), maximumY: camera.centerY + prepared.height / (2 * camera.zoom),
      minimumX: camera.centerX - prepared.width / (2 * camera.zoom), minimumY: camera.centerY - prepared.height / (2 * camera.zoom) },
  };
}

function reportFrameDecorationError(scope: string, error: unknown): void {
  console.error(`[CodeGraphy] Graph ${scope} decoration failed:`, error);
}

export function drawOwnedDecorationLayer(runtime: OwnedGraphFrameRuntime, layout: OwnedGraphLayout, prepared: PreparedOverlayCanvas, timestamp: number, gpuRendered: boolean): void {
  const { context } = prepared; const camera = runtime.cameraRef.current;
  context.save();
  try {
    context.translate(prepared.width / 2, prepared.height / 2);
    context.scale(camera.zoom, camera.zoom);
    context.translate(-camera.centerX, -camera.centerY);
    if (gpuRendered) {
      try {
        drawOwnedGraphOverlay(drawingOptions(runtime, layout, prepared, timestamp));
      } catch (error) {
        reportFrameDecorationError('overlay', error);
      }
    }
    context.save();
    try {
      runtime.propsRef.current.onRenderFramePost(context, camera.zoom);
    } catch (error) {
      reportFrameDecorationError('post-frame', error);
    } finally {
      context.restore();
    }
  } finally {
    context.restore();
  }
}
