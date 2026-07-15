import type { MutableRefObject } from 'react';
import type { FGLink, FGNode } from '../../../model/build';
import {
  advanceOwnedGraphCameraTransition,
  type OwnedGraphCamera,
} from './camera';
import { canvasSize } from './canvasGeometry';
import type { Surface2dProps } from './contracts';
import {
  drawOwnedGraphOverlay,
  type OwnedGraphDrawingOptions,
} from './drawing';
import {
  syncOwnedLayoutNodes,
  syncOwnedLayoutNodesAtVersion,
  type OwnedGraphLayout,
} from './layout';
import type { OwnedGraphStageAttributionProfiler } from './performance/attribution';
import type { PointerSession } from './interaction';
import type { OwnedGraphInteractionRecorder } from './performance/recording';
import {
  advanceOwnedGraphNodeHover,
  resetOwnedGraphNodeHover,
  type OwnedGraphNodeHover,
} from './nodeHover';
import type { OwnedGraphPluginForces } from './pluginForces';
import type { GraphLayoutTickResult } from './physics/contracts';
import {
  advanceGraphLayoutFixedTimestep,
  resetGraphLayoutFixedTimestepClock,
  type GraphLayoutFixedTimestepClock,
} from './physics/fixedTimestep';
import { ownedGraphNodeWorldScale } from './visualSize';
import type { OwnedWebGpuRenderer } from './webgpu/renderer';

interface PreparedOverlayCanvas {
  context: CanvasRenderingContext2D;
  devicePixelRatio: number;
  height: number;
  width: number;
}

export interface OwnedGraphFrameRuntime {
  cameraRef: MutableRefObject<OwnedGraphCamera>;
  engineStopNotifiedRef: MutableRefObject<boolean>;
  gpuRendererRef: MutableRefObject<OwnedWebGpuRenderer | null>;
  hoveredLinkRef: MutableRefObject<FGLink | null>;
  hoveredNodeRef: MutableRefObject<FGNode | null>;
  layoutRef: MutableRefObject<OwnedGraphLayout | null>;
  nodeHoverRef: MutableRefObject<OwnedGraphNodeHover>;
  performanceAttributionRef: MutableRefObject<OwnedGraphStageAttributionProfiler>;
  performanceRecorderRef: MutableRefObject<OwnedGraphInteractionRecorder>;
  pointerSessionRef: MutableRefObject<PointerSession | null>;
  pluginForcesRef: MutableRefObject<OwnedGraphPluginForces>;
  positionVersionRef: MutableRefObject<number>;
  propsRef: MutableRefObject<Surface2dProps>;
  rendererOperationalRef: MutableRefObject<boolean>;
  requestFrameRef: MutableRefObject<() => void>;
  simulationClockRef: MutableRefObject<GraphLayoutFixedTimestepClock>;
  markPerformanceIdle(this: void): void;
  recordRenderedFrame(
    this: void,
    timestamp: number,
    simulationMs: number,
    renderMs: number,
  ): void;
  synchronizedPositionVersionRef: MutableRefObject<number>;
  onRendererError(this: void, message: string): void;
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

function applyOwnedPluginForces(
  runtime: OwnedGraphFrameRuntime,
  layout: OwnedGraphLayout,
): void {
  const active = runtime.rendererOperationalRef.current
    && runtime.pluginForcesRef.current.active();
  if (!active) return;
  syncOwnedLayoutNodes(layout);
  runtime.pluginForcesRef.current.tick(layout.engine.alpha);
  importPluginKinematics(layout);
  layout.engine.setKinematics(
    layout.engine.x,
    layout.engine.y,
    layout.engine.vx,
    layout.engine.vy,
  );
  runtime.synchronizedPositionVersionRef.current = runtime.positionVersionRef.current;
}

interface OwnedGraphPhysicsFrame {
  simulationMs: number;
  tick: GraphLayoutTickResult;
}

function advanceOwnedGraphPhysics(
  runtime: OwnedGraphFrameRuntime,
  layout: OwnedGraphLayout,
  timestamp: number,
): OwnedGraphPhysicsFrame {
  const startedAt = performance.now();
  applyOwnedPluginForces(runtime, layout);
  const tick = advanceGraphLayoutFixedTimestep(runtime.simulationClockRef.current, {
    currentSettled: layout.engine.settled,
    minimumSteps: runtime.pointerSessionRef.current === null ? 0 : 1,
    step: () => layout.engine.tick(),
    timestampMs: timestamp,
  });
  const hostElapsedMs = Math.max(0, performance.now() - startedAt);
  if (tick.steps > 0) runtime.positionVersionRef.current += 1;
  return {
    simulationMs: hostElapsedMs,
    tick,
  };
}

function synchronizeOwnedFrameState(
  runtime: OwnedGraphFrameRuntime,
  layout: OwnedGraphLayout,
): void {
  runtime.synchronizedPositionVersionRef.current = syncOwnedLayoutNodesAtVersion(
    layout,
    runtime.positionVersionRef.current,
    runtime.synchronizedPositionVersionRef.current,
  );
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

function resolveOwnedHoveredNodeIndex(
  runtime: OwnedGraphFrameRuntime,
  layout: OwnedGraphLayout,
): number {
  const hover = runtime.nodeHoverRef.current;
  const nodeId = hover.nodeId;
  if (nodeId === null) return -1;
  const index = layout.engine.getNodeIndex(nodeId);
  if (index === undefined) {
    const hoveredNode = runtime.hoveredNodeRef.current;
    resetOwnedGraphNodeHover(hover);
    if (hoveredNode?.id === nodeId) {
      runtime.hoveredNodeRef.current = null;
      runtime.propsRef.current.sharedProps.onNodeHover(null);
    }
    return -1;
  }
  const currentNode = layout.nodes[index];
  if (hover.transition?.targetScale !== 1
    && runtime.hoveredNodeRef.current?.id === nodeId
    && runtime.hoveredNodeRef.current !== currentNode) {
    runtime.hoveredNodeRef.current = currentNode;
    runtime.propsRef.current.sharedProps.onNodeHover(currentNode);
  }
  return index;
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
      edgeSources: layout.engine.edgeSources,
      edgeTargets: layout.engine.edgeTargets,
      getArrowColor: props.getArrowColor,
      getLinkColor: props.getLinkColor,
      getLinkOpacity: props.getLinkOpacity,
      getLinkWidth: props.getLinkWidth,
      getNodeStyle: props.getNodeStyle,
      hoveredLink: runtime.hoveredLinkRef.current,
      hoveredNodeIndex: resolveOwnedHoveredNodeIndex(runtime, layout),
      hoveredNodeScale: runtime.nodeHoverRef.current.scale,
      links: layout.links,
      nodes: layout.nodes,
      nodeX: layout.engine.x,
      nodeY: layout.engine.y,
      positionVersion: runtime.positionVersionRef.current,
      styleVersion: props.getStyleRevision(),
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
    nodeLabelCanvasObject: props.nodeLabelCanvasObject,
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
  if (gpuRendered) drawOwnedGraphOverlay(options);
  runtime.propsRef.current.onRenderFramePost(context, camera.zoom);
  context.restore();
}

function synchronizeOwnedGraphCollisionScale(
  runtime: OwnedGraphFrameRuntime,
  layout: OwnedGraphLayout,
): void {
  const wasSettled = layout.engine.settled;
  layout.engine.setCollisionScale(ownedGraphNodeWorldScale(runtime.cameraRef.current.zoom));
  if (wasSettled && !layout.engine.settled) {
    runtime.engineStopNotifiedRef.current = false;
  }
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
): boolean {
  return runtime.rendererOperationalRef.current && (
    runtime.pointerSessionRef.current !== null
    || runtime.cameraRef.current.transition != null
    || runtime.nodeHoverRef.current.transition !== null
    || tick.moving
    || runtime.propsRef.current.directionMode === 'particles'
    || runtime.propsRef.current.showFps
  );
}

export function renderOwnedGraphFrame(
  runtime: OwnedGraphFrameRuntime,
  canvas: HTMLCanvasElement,
  timestamp: number,
): void {
  const layout = runtime.layoutRef.current;
  const context = canvas.getContext('2d');
  if (!layout || !context) return;
  advanceOwnedGraphCameraTransition(runtime.cameraRef.current, timestamp);
  advanceOwnedGraphNodeHover(runtime.nodeHoverRef.current, timestamp);
  synchronizeOwnedGraphCollisionScale(runtime, layout);
  const attribution = runtime.performanceAttributionRef.current;
  const frameAttributionStartedAt = attribution.startTiming();
  const physicsAttributionStartedAt = attribution.startTiming();
  const physicsFrame = advanceOwnedGraphPhysics(runtime, layout, timestamp);
  attribution.finishTiming('physicsStep', physicsAttributionStartedAt);
  const { tick } = physicsFrame;
  const physicsEndedAt = performance.now();
  const nodeSyncStartedAt = attribution.startTiming();
  synchronizeOwnedFrameState(runtime, layout);
  attribution.finishTiming('snapshotNodeSync', nodeSyncStartedAt);
  const canvasPrepareStartedAt = attribution.startTiming();
  const prepared = prepareOwnedOverlayCanvas(canvas, context);
  attribution.finishTiming('canvasPrepare', canvasPrepareStartedAt);
  const gpuRendered = submitOwnedWebGpuFrame(runtime, layout, prepared);
  const overlayStartedAt = attribution.startTiming();
  drawOwnedGraphDecorationLayer(
    runtime,
    layout,
    prepared,
    timestamp,
    gpuRendered,
  );
  attribution.finishTiming('overlay', overlayStartedAt);
  const frameEndedAt = performance.now();
  if (gpuRendered) {
    attribution.finishTiming('frameTotalCpu', frameAttributionStartedAt);
    attribution.recordRenderedFrame();
    const renderMs = Math.max(0, frameEndedAt - physicsEndedAt);
    runtime.performanceRecorderRef.current.recordFrame({
      alpha: layout.engine.alpha,
      nodeIds: layout.engine.nodeIds,
      presentationTimestampMs: timestamp,
      renderMs,
      renderedX: layout.engine.x,
      renderedY: layout.engine.y,
      settled: tick.settled,
      simulationMs: physicsFrame.simulationMs,
      steps: tick.steps,
      vx: layout.engine.vx,
      vy: layout.engine.vy,
    });
    runtime.recordRenderedFrame(timestamp, physicsFrame.simulationMs, renderMs);
  }
  notifyOwnedGraphSettlement(runtime, tick);
  if (shouldContinueOwnedGraphFrames(runtime, tick)) {
    runtime.requestFrameRef.current();
  } else if (
    tick.settled
    && runtime.propsRef.current.directionMode !== 'particles'
  ) {
    resetGraphLayoutFixedTimestepClock(runtime.simulationClockRef.current);
    runtime.markPerformanceIdle();
  }
}
