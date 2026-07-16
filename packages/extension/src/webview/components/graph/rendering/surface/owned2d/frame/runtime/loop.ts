import type { MutableRefObject } from 'react';
import { createOwnedGraphControls, type OwnedGraphControlsRuntime } from '../../view/surface/controls';
import type { OwnedGraph2dControls } from '../../view/surface/contracts';
import { renderOwnedGraphFrame, type OwnedGraphFrameRuntime } from './render';
import type {
  OwnedGraphPerformanceMonitor,
  OwnedGraphPerformanceSample,
} from '../performance/model';
import { observeDevicePixelRatio } from './pixelRatio';

export type OwnedGraphFrameLoopRuntime = Omit<
  OwnedGraphFrameRuntime,
  'markPerformanceIdle' | 'recordRenderedFrame'
> & OwnedGraphControlsRuntime & {
  animationFrameRef: MutableRefObject<number | null>;
  fpsRef: MutableRefObject<number | null>;
  frameRequestedRef: MutableRefObject<boolean>;
  performanceMonitorRef: MutableRefObject<OwnedGraphPerformanceMonitor>;
  publishPerformance(this: void, sample: OwnedGraphPerformanceSample): void;
};

export interface OwnedGraphFrameLoop {
  dispose(): void;
}

function canScheduleFrame(runtime: OwnedGraphFrameLoopRuntime, active: boolean): boolean {
  const renderer = runtime.gpuRendererRef.current;
  return active
    && runtime.animationFrameRef.current === null
    && (!renderer || renderer.canRender());
}

export function startOwnedGraphFrameLoop(
  runtime: OwnedGraphFrameLoopRuntime,
  canvas: HTMLCanvasElement,
  controlsRef: MutableRefObject<OwnedGraph2dControls | undefined>,
): OwnedGraphFrameLoop {
  let active = true;
  const frameRuntime: OwnedGraphFrameRuntime = {
    ...runtime,
    recordRenderedFrame(submissionId, timestamp, simulationMs, renderMs, secondaryRefreshMs) {
      runtime.performanceMonitorRef.current.stageFrame(submissionId, {
        presentationTimestampMs: timestamp,
        renderMs,
        secondaryRefreshMs,
        simulationMs,
      });
    },
    markPerformanceIdle() {
      const idleSample = runtime.performanceMonitorRef.current.setIdle();
      runtime.fpsRef.current = null;
      runtime.publishPerformance(idleSample);
    },
  };

  const renderFrame = (timestamp: number): void => {
    runtime.animationFrameRef.current = null;
    runtime.frameRequestedRef.current = false;
    if (!active) return;
    renderOwnedGraphFrame(frameRuntime, canvas, timestamp);
  };

  runtime.requestFrameRef.current = () => {
    runtime.frameRequestedRef.current = true;
    if (canScheduleFrame(runtime, active)) {
      runtime.animationFrameRef.current = window.requestAnimationFrame(renderFrame);
    }
  };

  const controls = createOwnedGraphControls(runtime, canvas);
  controlsRef.current = controls;
  const resizeObserver = new ResizeObserver(() => runtime.requestFrameRef.current());
  resizeObserver.observe(canvas);
  const stopObservingDevicePixelRatio = observeDevicePixelRatio(
    () => runtime.requestFrameRef.current(),
  );
  runtime.requestFrameRef.current();

  return {
    dispose: () => {
      active = false;
      resizeObserver.disconnect();
      stopObservingDevicePixelRatio();
      if (runtime.animationFrameRef.current !== null) {
        window.cancelAnimationFrame(runtime.animationFrameRef.current);
        runtime.animationFrameRef.current = null;
      }
      if (controlsRef.current === controls) controlsRef.current = undefined;
    },
  };
}
