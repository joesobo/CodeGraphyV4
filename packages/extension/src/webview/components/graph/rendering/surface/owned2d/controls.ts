import type { MutableRefObject } from 'react';
import {
  clampOwnedGraphZoom,
  fitOwnedGraphCamera,
  graphToScreen,
  screenToGraph,
  type OwnedGraphCamera,
} from './camera';
import { canvasSize } from './canvasGeometry';
import type { OwnedGraph2dControls } from './contracts';
import type { OwnedGraphLayout } from './layout';
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
  markPerformanceIdle(this: void): void;
  performanceAttributionRef: MutableRefObject<OwnedGraphStageAttributionProfiler>;
  performanceMonitorRef: MutableRefObject<OwnedGraphPerformanceMonitor | null>;
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
  const controls: OwnedGraph2dControls = {
    centerAt: (x, y) => {
      runtime.cameraRef.current.centerX = x;
      runtime.cameraRef.current.centerY = y;
      invalidateCamera(runtime);
    },
    d3ReheatSimulation: () => {
      runtime.layoutRef.current?.engine.reheat();
      runtime.engineStopNotifiedRef.current = false;
      resetGraphLayoutFixedTimestepClock(runtime.simulationClockRef.current);
      runtime.requestFrameRef.current();
    },
    getFps: () => runtime.fpsRef.current,
    getPerformance: () => runtime.performanceMonitorRef.current?.sample() ?? { status: 'idle' },
    graph2ScreenCoords: (x, y) => {
      const size = canvasSize(canvas);
      return graphToScreen(runtime.cameraRef.current, size.width, size.height, x, y);
    },
    pauseAnimation: () => {
      runtime.layoutRef.current?.engine.pause();
      resetGraphLayoutFixedTimestepClock(runtime.simulationClockRef.current);
      runtime.markPerformanceIdle();
    },
    refresh: () => runtime.requestFrameRef.current(),
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
    zoom: ((scale?: number) => {
      if (scale === undefined) return runtime.cameraRef.current.zoom;
      runtime.cameraRef.current.zoom = clampOwnedGraphZoom(scale);
      invalidateCamera(runtime);
      return controls;
    }) as OwnedGraph2dControls['zoom'],
    zoomToFit: (_durationMs, padding) => {
      const size = canvasSize(canvas);
      fitOwnedGraphCamera(
        runtime.cameraRef.current,
        runtime.layoutRef.current?.nodes ?? [],
        size.width,
        size.height,
        padding,
      );
      invalidateCamera(runtime);
    },
  };
  return controls;
}
