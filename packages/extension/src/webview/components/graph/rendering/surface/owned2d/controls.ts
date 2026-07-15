import type { MutableRefObject } from 'react';
import {
  fitOwnedGraphCamera,
  graphToScreen,
  readOwnedGraphCameraTargetZoom,
  screenToGraph,
  transitionOwnedGraphCamera,
  type OwnedGraphCamera,
  type OwnedGraphCameraPose,
} from './camera';
import { canvasSize } from './canvasGeometry';
import type { OwnedGraph2dControls } from './contracts';
import type { OwnedGraphLayout } from './layout';
import { graphMotionDuration } from './motion';
import type { OwnedGraphStageAttributionProfiler } from './performance/attribution';
import type { OwnedGraphPerformanceMonitor } from './performance/model';
import type { OwnedGraphInteractionRecorder } from './performance/recording';
import {
  resetGraphLayoutFixedTimestepClock,
  type GraphLayoutFixedTimestepClock,
} from './physics/fixedTimestep';
import { updateOwnedGraphViewportNode } from './viewportNode';

export interface OwnedGraphControlsRuntime {
  cameraRef: MutableRefObject<OwnedGraphCamera>;
  clearLinkHover(this: void): boolean;
  engineStopNotifiedRef: MutableRefObject<boolean>;
  fpsRef: MutableRefObject<number | null>;
  layoutRef: MutableRefObject<OwnedGraphLayout | null>;
  performanceAttributionRef: MutableRefObject<OwnedGraphStageAttributionProfiler>;
  performanceMonitorRef: MutableRefObject<OwnedGraphPerformanceMonitor>;
  performanceRecorderRef: MutableRefObject<OwnedGraphInteractionRecorder>;
  positionVersionRef: MutableRefObject<number>;
  rendererOperationalRef: MutableRefObject<boolean>;
  requestFrameRef: MutableRefObject<() => void>;
  simulationClockRef: MutableRefObject<GraphLayoutFixedTimestepClock>;
}

function invalidateCamera(runtime: OwnedGraphControlsRuntime): void {
  runtime.clearLinkHover();
  runtime.requestFrameRef.current();
}

function updateCamera(
  runtime: OwnedGraphControlsRuntime,
  target: Partial<OwnedGraphCameraPose>,
  durationMs?: number,
): void {
  const duration = graphMotionDuration(durationMs);
  transitionOwnedGraphCamera(
    runtime.cameraRef.current,
    target,
    duration,
    duration > 0 ? performance.now() : 0,
  );
  invalidateCamera(runtime);
}

function updateViewportNode(
  runtime: OwnedGraphControlsRuntime,
  nodeId: string,
  updates: Record<string, unknown>,
): boolean {
  const updated = updateOwnedGraphViewportNode(runtime.layoutRef.current, nodeId, updates);
  if (!updated) return false;
  runtime.positionVersionRef.current += 1;
  runtime.engineStopNotifiedRef.current = false;
  resetGraphLayoutFixedTimestepClock(runtime.simulationClockRef.current);
  runtime.requestFrameRef.current();
  return true;
}

export function createOwnedGraphControls(
  runtime: OwnedGraphControlsRuntime,
  canvas: HTMLCanvasElement,
): OwnedGraph2dControls {
  const zoom = ((scale?: number, durationMs?: number) => {
    if (scale === undefined) return runtime.cameraRef.current.zoom;
    updateCamera(runtime, { zoom: scale }, durationMs);
  }) as OwnedGraph2dControls['zoom'];

  return {
    centerAt: (x, y, durationMs) => {
      updateCamera(runtime, { centerX: x, centerY: y }, durationMs);
    },
    reheatSimulation: () => {
      runtime.layoutRef.current?.engine.reheat();
      runtime.engineStopNotifiedRef.current = false;
      resetGraphLayoutFixedTimestepClock(runtime.simulationClockRef.current);
      runtime.requestFrameRef.current();
    },
    getFps: () => runtime.fpsRef.current,
    getPerformance: () => runtime.performanceMonitorRef.current.sample(),
    graph2ScreenCoords: (x, y) => {
      const size = canvasSize(canvas);
      return graphToScreen(runtime.cameraRef.current, size.width, size.height, x, y);
    },
    resumeAnimation: () => {
      if (!runtime.rendererOperationalRef.current) return;
      runtime.layoutRef.current?.engine.resume();
      resetGraphLayoutFixedTimestepClock(runtime.simulationClockRef.current);
      runtime.requestFrameRef.current();
    },
    screen2GraphCoords: (x, y) => {
      const size = canvasSize(canvas);
      return screenToGraph(runtime.cameraRef.current, size.width, size.height, x, y);
    },
    startInteractionRecording: options => {
      runtime.performanceRecorderRef.current.start(options);
    },
    startStageAttributionRecording: () => runtime.performanceAttributionRef.current.start(),
    stopInteractionRecording: () => runtime.performanceRecorderRef.current.stop(),
    stopStageAttributionRecording: () => runtime.performanceAttributionRef.current.stop(),
    updateNode: (nodeId, updates) => updateViewportNode(runtime, nodeId, updates),
    zoom,
    zoomBy: (factor, durationMs) => {
      const destination = readOwnedGraphCameraTargetZoom(runtime.cameraRef.current);
      updateCamera(runtime, { zoom: destination * factor }, durationMs);
    },
    zoomToFit: (durationMs, padding) => {
      const size = canvasSize(canvas);
      const target: OwnedGraphCamera = { ...runtime.cameraRef.current, transition: null };
      if (!fitOwnedGraphCamera(
        target,
        runtime.layoutRef.current?.nodes ?? [],
        size.width,
        size.height,
        padding,
      )) return;
      updateCamera(runtime, {
        centerX: target.centerX,
        centerY: target.centerY,
        zoom: target.zoom,
      }, durationMs);
    },
  };
}
