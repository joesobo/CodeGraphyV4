import { canvasSize } from './canvasGeometry';
import { drawOwnedGraphOverlay, type OwnedGraphDrawingOptions } from './drawing';
import type { OwnedGraphFrameRuntime } from './frame';
import type { OwnedGraphLayout } from './layout';

export interface PreparedOverlayCanvas { context: CanvasRenderingContext2D; devicePixelRatio: number; height: number; width: number }

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

function drawingOptions(runtime: OwnedGraphFrameRuntime, layout: OwnedGraphLayout, prepared: PreparedOverlayCanvas, timestamp: number): OwnedGraphDrawingOptions {
  const props = runtime.propsRef.current; const camera = runtime.cameraRef.current;
  return {
    context: prepared.context, directionMode: props.directionMode, getLinkParticles: props.getLinkParticles,
    getParticleColor: props.getParticleColor, globalScale: camera.zoom, links: layout.links, nodes: layout.nodes,
    nodeLabelCanvasObject: props.nodeLabelCanvasObject, particleSize: props.particleSize,
    particleSpeed: props.particleSpeed, timestamp,
    viewport: { maximumX: camera.centerX + prepared.width / (2 * camera.zoom), maximumY: camera.centerY + prepared.height / (2 * camera.zoom),
      minimumX: camera.centerX - prepared.width / (2 * camera.zoom), minimumY: camera.centerY - prepared.height / (2 * camera.zoom) },
  };
}

export function drawOwnedDecorationLayer(runtime: OwnedGraphFrameRuntime, layout: OwnedGraphLayout, prepared: PreparedOverlayCanvas, timestamp: number, gpuRendered: boolean): void {
  const { context } = prepared; const camera = runtime.cameraRef.current;
  context.save(); context.translate(prepared.width / 2, prepared.height / 2);
  context.scale(camera.zoom, camera.zoom); context.translate(-camera.centerX, -camera.centerY);
  if (gpuRendered) drawOwnedGraphOverlay(drawingOptions(runtime, layout, prepared, timestamp));
  runtime.propsRef.current.onRenderFramePost(context, camera.zoom);
  context.restore();
}
