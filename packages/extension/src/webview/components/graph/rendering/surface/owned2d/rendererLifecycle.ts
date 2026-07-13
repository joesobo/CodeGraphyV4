import type { MutableRefObject } from 'react';
import type { OwnedGraphLayout } from './layout';
import { OwnedWebGpuRenderer } from './webgpu/renderer';

export type OwnedGraphRendererStatus = 'error' | 'initializing' | 'webgpu';

export interface OwnedGraphRendererLifecycleRuntime {
  engineStopNotifiedRef: MutableRefObject<boolean>;
  frameRequestedRef: MutableRefObject<boolean>;
  gpuRendererRef: MutableRefObject<OwnedWebGpuRenderer | null>;
  layoutRef: MutableRefObject<OwnedGraphLayout | null>;
  rendererOperationalRef: MutableRefObject<boolean>;
  requestFrameRef: MutableRefObject<() => void>;
  onError(this: void, message: string): void;
  onReady(this: void): void;
}

export interface OwnedGraphRendererLifecycle {
  dispose(): void;
}

function pauseOwnedGraphRendererPhysics(runtime: OwnedGraphRendererLifecycleRuntime): void {
  runtime.rendererOperationalRef.current = false;
  runtime.layoutRef.current?.engine.pause();
}

function reportOwnedGraphRendererError(
  runtime: OwnedGraphRendererLifecycleRuntime,
  message: string,
  requestFrame: boolean,
): void {
  pauseOwnedGraphRendererPhysics(runtime);
  runtime.onError(message);
  if (requestFrame) runtime.requestFrameRef.current();
}

function disposeCurrentRenderer(runtime: OwnedGraphRendererLifecycleRuntime): void {
  runtime.gpuRendererRef.current?.dispose();
  runtime.gpuRendererRef.current = null;
}

function activateOwnedGraphRenderer(
  runtime: OwnedGraphRendererLifecycleRuntime,
  renderer: OwnedWebGpuRenderer,
): void {
  runtime.gpuRendererRef.current = renderer;
  runtime.rendererOperationalRef.current = true;
  const layout = runtime.layoutRef.current;
  if (layout) {
    layout.engine.resume();
    layout.engine.reheat();
    runtime.engineStopNotifiedRef.current = false;
  }
  runtime.onReady();
  runtime.requestFrameRef.current();
}

export function startOwnedGraphRendererLifecycle(
  runtime: OwnedGraphRendererLifecycleRuntime,
  canvas: HTMLCanvasElement,
): OwnedGraphRendererLifecycle {
  let active = true;
  void OwnedWebGpuRenderer.create(canvas, {
    onDeviceLost: message => {
      if (!active) return;
      disposeCurrentRenderer(runtime);
      reportOwnedGraphRendererError(
        runtime,
        message || 'The WebGPU device was lost.',
        true,
      );
    },
    onFrameComplete: () => {
      if (active && runtime.frameRequestedRef.current) runtime.requestFrameRef.current();
    },
  }).then(renderer => {
    if (!active) {
      renderer?.dispose();
      return;
    }
    if (!renderer) {
      reportOwnedGraphRendererError(
        runtime,
        'WebGPU is unavailable in this environment.',
        false,
      );
      return;
    }
    activateOwnedGraphRenderer(runtime, renderer);
  }).catch((error: unknown) => {
    if (!active) return;
    reportOwnedGraphRendererError(
      runtime,
      error instanceof Error ? error.message : String(error),
      false,
    );
  });

  return {
    dispose: () => {
      active = false;
      runtime.rendererOperationalRef.current = false;
      disposeCurrentRenderer(runtime);
    },
  };
}
