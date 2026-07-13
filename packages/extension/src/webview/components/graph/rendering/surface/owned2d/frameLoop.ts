import type { MutableRefObject } from 'react';
import { createOwnedGraphControls, type OwnedGraphControlsRuntime } from './controls';
import type { OwnedGraph2dControls } from './contracts';
import { renderOwnedGraphFrame, type OwnedGraphFrameRuntime } from './frame';
import type { RenderedFrameFpsSampler } from './fps';

export interface OwnedGraphFrameLoopRuntime
  extends OwnedGraphFrameRuntime, OwnedGraphControlsRuntime {
  animationFrameRef: MutableRefObject<number | null>;
  fpsRef: MutableRefObject<number | null>;
  fpsSamplerRef: MutableRefObject<RenderedFrameFpsSampler | null>;
  frameRequestedRef: MutableRefObject<boolean>;
  publishFps(this: void, fps: number, frameTimeMs: number | null): void;
}

export interface OwnedGraphFrameLoop {
  controls: OwnedGraph2dControls;
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
  let previousTimestamp: number | null = null;

  runtime.recordRenderedFrame = (timestamp: number): void => {
    const sampler = runtime.fpsSamplerRef.current;
    if (!sampler) return;
    const publishedFps = sampler.record(timestamp);
    runtime.fpsRef.current = sampler.fps;
    if (publishedFps !== undefined) runtime.publishFps(publishedFps, sampler.frameTimeMs);
  };

  const renderFrame = (timestamp: number): void => {
    runtime.animationFrameRef.current = null;
    runtime.frameRequestedRef.current = false;
    if (!active) return;
    previousTimestamp = renderOwnedGraphFrame(runtime, canvas, timestamp, previousTimestamp);
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
    controls,
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
