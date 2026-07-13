import type { MutableRefObject } from 'react';
import type { FGNode } from '../../../model/build';
import type { OwnedGraphCamera } from './camera';
import { canvasSize } from './canvasGeometry';
import type { OwnedGraphNodeStyle, Surface2dProps } from './contracts';
import {
  drawOwnedGraphLabels,
  drawOwnedGraphOverlay,
  drawOwnedGraphParticles,
  type OwnedGraphDrawingOptions,
} from './drawing';
import {
  canRunOwnedGraphPhysics,
  syncOwnedLayoutNodes,
  type OwnedGraphLayout,
} from './layout';
import type { OwnedGraphNodePicker } from './picking';
import type { OwnedGraphPluginForces } from './pluginForces';
import type { GraphLayoutTickResult } from './physics/contracts';
import type { OwnedWebGpuRenderer } from './webgpu/renderer';

const CANVAS_DECORATION_NODE_LIMIT = 5_000;

interface FramePerfSample extends Record<string, number> {
  gpuMs: number;
  overlayMs: number;
  physicsMs: number;
  syncMs: number;
}

interface FrameTimings {
  gpuEndedAt: number;
  gpuStartedAt: number;
  physicsEndedAt: number;
  physicsStartedAt: number;
  syncEndedAt: number;
}

interface PreparedOverlayCanvas {
  context: CanvasRenderingContext2D;
  devicePixelRatio: number;
  height: number;
  width: number;
}

export interface OwnedGraphFrameRuntime {
  cameraRef: MutableRefObject<OwnedGraphCamera>;
  engineStopNotifiedRef: MutableRefObject<boolean>;
  fpsRef: MutableRefObject<number | null>;
  gpuRendererRef: MutableRefObject<OwnedWebGpuRenderer | null>;
  layoutRef: MutableRefObject<OwnedGraphLayout | null>;
  pickerPositionVersionRef: MutableRefObject<number>;
  pickerRef: MutableRefObject<OwnedGraphNodePicker>;
  pluginForcesRef: MutableRefObject<OwnedGraphPluginForces>;
  positionVersionRef: MutableRefObject<number>;
  propsRef: MutableRefObject<Surface2dProps>;
  rendererOperationalRef: MutableRefObject<boolean>;
  requestFrameRef: MutableRefObject<() => void>;
  recordRenderedFrame(this: void, timestamp: number): void;
  skipPhysicsFrameRef: MutableRefObject<boolean>;
  styleVersionRef: MutableRefObject<number>;
  onRendererError(this: void, message: string): void;
}

function defaultNodeStyle(node: FGNode): OwnedGraphNodeStyle {
  return {
    borderColor: node.borderColor,
    borderWidth: node.borderWidth,
    cornerRadius: Math.max(0, node.cornerRadius2D ?? 0),
    fillColor: node.color,
    fillOpacity: node.fillOpacity2D ?? 1,
    height: node.shapeSize2D?.height ?? node.size * 2,
    opacity: node.baseOpacity,
    shape: node.shape2D ?? 'circle',
    width: node.shapeSize2D?.width ?? node.size * 2,
  };
}

function importPluginKinematics(layout: OwnedGraphLayout): void {
  for (let index = 0; index < layout.nodes.length; index += 1) {
    const node = layout.nodes[index];
    if (Number.isFinite(node.x)) layout.engine.x[index] = node.x as number;
    if (Number.isFinite(node.y)) layout.engine.y[index] = node.y as number;
    if (Number.isFinite(node.vx)) layout.engine.vx[index] = node.vx as number;
    if (Number.isFinite(node.vy)) layout.engine.vy[index] = node.vy as number;
  }
}

function advanceOwnedGraphPhysics(
  runtime: OwnedGraphFrameRuntime,
  layout: OwnedGraphLayout,
  elapsedMs: number,
  canRunPhysics: boolean,
): GraphLayoutTickResult {
  const skipPhysics = runtime.skipPhysicsFrameRef.current;
  runtime.skipPhysicsFrameRef.current = false;
  if (canRunPhysics && runtime.pluginForcesRef.current.active()) {
    syncOwnedLayoutNodes(layout);
    runtime.pluginForcesRef.current.tick(layout.engine.alpha);
    importPluginKinematics(layout);
  }
  const tick = skipPhysics
    ? { moving: !layout.engine.settled, settled: layout.engine.settled, steps: 0 }
    : layout.engine.tick(elapsedMs);
  if (tick.steps > 0) runtime.positionVersionRef.current += 1;
  return tick;
}

function synchronizeOwnedFrameState(
  runtime: OwnedGraphFrameRuntime,
  layout: OwnedGraphLayout,
): void {
  syncOwnedLayoutNodes(layout);
  if (runtime.pickerPositionVersionRef.current === runtime.positionVersionRef.current) return;
  runtime.pickerRef.current.rebuild(layout.nodes);
  runtime.pickerPositionVersionRef.current = runtime.positionVersionRef.current;
}

function prepareOwnedOverlayCanvas(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
): PreparedOverlayCanvas {
  const { width, height } = canvasSize(canvas);
  const devicePixelRatio = Math.max(1, window.devicePixelRatio || 1);
  const backingWidth = Math.max(1, Math.round(width * devicePixelRatio));
  const backingHeight = Math.max(1, Math.round(height * devicePixelRatio));
  if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
    canvas.width = backingWidth;
    canvas.height = backingHeight;
  }
  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);
  return { context, devicePixelRatio, height, width };
}

function failOwnedWebGpuFrame(
  runtime: OwnedGraphFrameRuntime,
  layout: OwnedGraphLayout,
  renderer: OwnedWebGpuRenderer,
  error: unknown,
): void {
  renderer.dispose();
  runtime.gpuRendererRef.current = null;
  runtime.rendererOperationalRef.current = false;
  layout.engine.pause();
  runtime.onRendererError(error instanceof Error ? error.message : String(error));
}

function submitOwnedWebGpuFrame(
  runtime: OwnedGraphFrameRuntime,
  layout: OwnedGraphLayout,
  prepared: PreparedOverlayCanvas,
): boolean {
  const renderer = runtime.gpuRendererRef.current;
  if (!renderer) return false;
  const props = runtime.propsRef.current;
  try {
    renderer.render({
      backgroundColor: props.backgroundColor,
      camera: runtime.cameraRef.current,
      cssHeight: prepared.height,
      cssWidth: prepared.width,
      devicePixelRatio: prepared.devicePixelRatio,
      directionMode: props.directionMode,
      getArrowColor: props.getArrowColor,
      getArrowRelPos: props.getArrowRelPos,
      getLinkColor: props.getLinkColor,
      getLinkWidth: props.getLinkWidth,
      getNodeStyle: props.getNodeStyle ?? defaultNodeStyle,
      links: layout.links,
      nodes: layout.nodes,
      positionVersion: runtime.positionVersionRef.current,
      styleVersion: runtime.styleVersionRef.current,
    });
    return true;
  } catch (error) {
    failOwnedWebGpuFrame(runtime, layout, renderer, error);
    return false;
  }
}

function drawingOptions(
  runtime: OwnedGraphFrameRuntime,
  layout: OwnedGraphLayout,
  prepared: PreparedOverlayCanvas,
  timestamp: number,
): OwnedGraphDrawingOptions {
  const props = runtime.propsRef.current;
  const camera = runtime.cameraRef.current;
  return {
    context: prepared.context,
    directionMode: props.directionMode,
    getLinkParticles: props.getLinkParticles,
    getParticleColor: props.getParticleColor,
    globalScale: camera.zoom,
    links: layout.links,
    nodes: layout.nodes,
    nodeLabelCanvasObject: props.nodeLabelCanvasObject ?? (() => undefined),
    particleSize: props.particleSize,
    particleSpeed: props.particleSpeed,
    timestamp,
    viewport: {
      maximumX: camera.centerX + prepared.width / (2 * camera.zoom),
      maximumY: camera.centerY + prepared.height / (2 * camera.zoom),
      minimumX: camera.centerX - prepared.width / (2 * camera.zoom),
      minimumY: camera.centerY - prepared.height / (2 * camera.zoom),
    },
  };
}

function drawOwnedGraphDecorationLayer(
  runtime: OwnedGraphFrameRuntime,
  layout: OwnedGraphLayout,
  prepared: PreparedOverlayCanvas,
  timestamp: number,
  gpuRendered: boolean,
): void {
  const context = prepared.context;
  const camera = runtime.cameraRef.current;
  context.save();
  context.translate(prepared.width / 2, prepared.height / 2);
  context.scale(camera.zoom, camera.zoom);
  context.translate(-camera.centerX, -camera.centerY);
  const options = drawingOptions(runtime, layout, prepared, timestamp);
  if (gpuRendered && layout.nodes.length <= CANVAS_DECORATION_NODE_LIMIT) {
    drawOwnedGraphOverlay(options);
  } else if (gpuRendered) {
    drawOwnedGraphParticles(options);
    drawOwnedGraphLabels(options);
  }
  runtime.propsRef.current.onRenderFramePost(context, camera.zoom);
  context.restore();
}

function performanceSamples(): FramePerfSample[] | undefined {
  return (window as typeof window & {
    __CODEGRAPHY_WEBGPU_PERF__?: FramePerfSample[];
  }).__CODEGRAPHY_WEBGPU_PERF__;
}

function timedNow(samples: FramePerfSample[] | undefined): number {
  return samples ? performance.now() : 0;
}

function recordOwnedGraphFrameMetrics(
  samples: FramePerfSample[] | undefined,
  timings: FrameTimings,
): void {
  if (!samples) return;
  samples.push({
    gpuMs: timings.gpuEndedAt - timings.gpuStartedAt,
    overlayMs: performance.now() - timings.gpuEndedAt,
    physicsMs: timings.physicsEndedAt - timings.physicsStartedAt,
    syncMs: timings.syncEndedAt - timings.physicsEndedAt,
  });
  if (samples.length > 240) samples.shift();
}

function notifyOwnedGraphSettlement(
  runtime: OwnedGraphFrameRuntime,
  tick: GraphLayoutTickResult,
): void {
  if (!tick.settled || runtime.engineStopNotifiedRef.current) return;
  runtime.engineStopNotifiedRef.current = true;
  runtime.propsRef.current.sharedProps.onEngineStop();
}

function shouldContinueOwnedGraphFrames(
  runtime: OwnedGraphFrameRuntime,
  tick: GraphLayoutTickResult,
  canRunPhysics: boolean,
): boolean {
  return runtime.rendererOperationalRef.current && (
    (!tick.settled && canRunPhysics)
    || runtime.propsRef.current.directionMode === 'particles'
    || (runtime.propsRef.current.showFps === true && runtime.fpsRef.current === null)
  );
}

export function renderOwnedGraphFrame(
  runtime: OwnedGraphFrameRuntime,
  canvas: HTMLCanvasElement,
  timestamp: number,
  previousTimestamp: number | null,
): number | null {
  const layout = runtime.layoutRef.current;
  const context = canvas.getContext('2d');
  if (!layout || !context) return previousTimestamp;
  const elapsedMs = previousTimestamp === null ? 1000 / 60 : timestamp - previousTimestamp;
  const canRunPhysics = canRunOwnedGraphPhysics(
    runtime.rendererOperationalRef.current,
    runtime.propsRef.current.physicsPaused,
  );
  const samples = performanceSamples();
  const timings: FrameTimings = {
    physicsStartedAt: timedNow(samples),
    physicsEndedAt: 0,
    syncEndedAt: 0,
    gpuStartedAt: 0,
    gpuEndedAt: 0,
  };
  const tick = advanceOwnedGraphPhysics(runtime, layout, elapsedMs, canRunPhysics);
  timings.physicsEndedAt = timedNow(samples);
  synchronizeOwnedFrameState(runtime, layout);
  timings.syncEndedAt = timedNow(samples);
  const prepared = prepareOwnedOverlayCanvas(canvas, context);
  timings.gpuStartedAt = timedNow(samples);
  const gpuRendered = submitOwnedWebGpuFrame(runtime, layout, prepared);
  if (gpuRendered && runtime.propsRef.current.showFps === true) {
    runtime.recordRenderedFrame(timestamp);
  }
  timings.gpuEndedAt = timedNow(samples);
  drawOwnedGraphDecorationLayer(runtime, layout, prepared, timestamp, gpuRendered);
  recordOwnedGraphFrameMetrics(samples, timings);
  notifyOwnedGraphSettlement(runtime, tick);
  if (shouldContinueOwnedGraphFrames(runtime, tick, canRunPhysics)) {
    runtime.requestFrameRef.current();
  }
  return timestamp;
}
