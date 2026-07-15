import type { MutableRefObject } from 'react';
import { createOwnedGraphControls, type OwnedGraphControlsRuntime } from './controls';
import type { OwnedGraph2dControls } from './contracts';
import { renderOwnedGraphFrame, type OwnedGraphFrameRuntime } from './frame';
import type {
  OwnedGraphPerformanceMonitor,
  OwnedGraphPerformanceSample,
} from './performance/model';

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
    recordRenderedFrame(timestamp, simulationMs, renderMs) {
      const publishedSample = runtime.performanceMonitorRef.current.recordFrame({
        presentationTimestampMs: timestamp,
        renderMs,
        simulationMs,
      });
      if (publishedSample === undefined) return;
      runtime.fpsRef.current = publishedSample.status === 'active'
        ? publishedSample.displayedFps
        : null;
      runtime.publishPerformance(publishedSample);
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
  runtime.requestFrameRef.current();

  return {
    dispose: () => {
      active = false;
      resizeObserver.disconnect();
      if (runtime.animationFrameRef.current !== null) {
        window.cancelAnimationFrame(runtime.animationFrameRef.current);
        runtime.animationFrameRef.current = null;
      }
      if (controlsRef.current === controls) controlsRef.current = undefined;
    },
  };
}
