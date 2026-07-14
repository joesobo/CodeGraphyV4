import type { MutableRefObject } from 'react';
import type { OwnedGraphLayout } from './layout';
import type { OwnedGraphStageAttributionProfiler } from './performance/attribution';
import {
  resetGraphLayoutFixedTimestepClock,
  type GraphLayoutFixedTimestepClock,
} from './physics/fixedTimestep';
import { OwnedWebGpuRenderer } from './webgpu/renderer';

export type OwnedGraphRendererStatus = 'error' | 'initializing' | 'webgpu';

export interface OwnedGraphRendererLifecycleRuntime {
  engineStopNotifiedRef: MutableRefObject<boolean>;
  frameRequestedRef: MutableRefObject<boolean>;
  gpuRendererRef: MutableRefObject<OwnedWebGpuRenderer | null>;
  layoutRef: MutableRefObject<OwnedGraphLayout | null>;
  performanceAttributionRef: MutableRefObject<OwnedGraphStageAttributionProfiler>;
  rendererOperationalRef: MutableRefObject<boolean>;
  requestFrameRef: MutableRefObject<() => void>;
  simulationClockRef: MutableRefObject<GraphLayoutFixedTimestepClock>;
  onError(this: void, message: string): void;
  onReady(this: void): void;
  onRecovering(this: void): void;
}

export interface OwnedGraphRendererLifecycle {
  dispose(): void;
}

function pauseOwnedGraphRendererPhysics(runtime: OwnedGraphRendererLifecycleRuntime): void {
  runtime.rendererOperationalRef.current = false;
  runtime.layoutRef.current?.engine.pause();
  resetGraphLayoutFixedTimestepClock(runtime.simulationClockRef.current);
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
  resetGraphLayoutFixedTimestepClock(runtime.simulationClockRef.current);
  const layout = runtime.layoutRef.current;
  if (layout) {
    layout.engine.resume();
    layout.engine.reheat();
    runtime.engineStopNotifiedRef.current = false;
  }
  runtime.onReady();
  runtime.requestFrameRef.current();
}

const MAX_DEVICE_RECOVERY_ATTEMPTS = 2;

export function startOwnedGraphRendererLifecycle(
  runtime: OwnedGraphRendererLifecycleRuntime,
  canvas: HTMLCanvasElement,
): OwnedGraphRendererLifecycle {
  let active = true;
  let generation = 0;
  let recoveryAttempts = 0;

  function recoverRenderer(message: string): void {
    disposeCurrentRenderer(runtime);
    pauseOwnedGraphRendererPhysics(runtime);
    if (recoveryAttempts >= MAX_DEVICE_RECOVERY_ATTEMPTS) {
      reportOwnedGraphRendererError(runtime, message, true);
      return;
    }
    recoveryAttempts += 1;
    runtime.onRecovering();
    createRenderer(true);
  }

  function handleCreationFailure(message: string, recovering: boolean): void {
    if (recovering) {
      recoverRenderer(message);
    } else {
      reportOwnedGraphRendererError(runtime, message, false);
    }
  }

  function createRenderer(recovering: boolean): void {
    const rendererGeneration = ++generation;
    void OwnedWebGpuRenderer.create(canvas, {
      attributionProfiler: runtime.performanceAttributionRef.current,
      onDeviceLost: message => {
        if (!active || rendererGeneration !== generation) return;
        recoverRenderer(message || 'The WebGPU device was lost.');
      },
      onFrameComplete: () => {
        if (!active || rendererGeneration !== generation) return;
        recoveryAttempts = 0;
        if (runtime.frameRequestedRef.current) runtime.requestFrameRef.current();
      },
    }).then(renderer => {
      if (!active || rendererGeneration !== generation) {
        renderer?.dispose();
        return;
      }
      if (!renderer) {
        handleCreationFailure('WebGPU is unavailable in this environment.', recovering);
        return;
      }
      activateOwnedGraphRenderer(runtime, renderer);
    }).catch((error: unknown) => {
      if (!active || rendererGeneration !== generation) return;
      handleCreationFailure(
        error instanceof Error ? error.message : String(error),
        recovering,
      );
    });
  }

  createRenderer(false);

  return {
    dispose: () => {
      active = false;
      generation += 1;
      runtime.rendererOperationalRef.current = false;
      disposeCurrentRenderer(runtime);
    },
  };
}
