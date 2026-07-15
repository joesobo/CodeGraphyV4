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

class ActiveOwnedGraphRendererLifecycle implements OwnedGraphRendererLifecycle {
  private active = true;
  private generation = 0;
  private recoveryAttempts = 0;

  constructor(
    private readonly runtime: OwnedGraphRendererLifecycleRuntime,
    private readonly canvas: HTMLCanvasElement,
  ) {}

  start(): void {
    this.createRenderer(false);
  }

  dispose(): void {
    this.active = false;
    this.generation += 1;
    this.runtime.rendererOperationalRef.current = false;
    disposeCurrentRenderer(this.runtime);
  }

  private createRenderer(recovering: boolean): void {
    const rendererGeneration = ++this.generation;
    void OwnedWebGpuRenderer.create(this.canvas, {
      attributionProfiler: this.runtime.performanceAttributionRef.current,
      onDeviceLost: message => this.handleDeviceLost(rendererGeneration, message),
      onFrameComplete: () => this.handleFrameComplete(rendererGeneration),
    }).then(renderer => {
      this.handleCreatedRenderer(rendererGeneration, recovering, renderer);
    }).catch((error: unknown) => {
      this.handleCreationError(rendererGeneration, recovering, error);
    });
  }

  private currentGeneration(rendererGeneration: number): boolean {
    return this.active && rendererGeneration === this.generation;
  }

  private handleCreatedRenderer(
    rendererGeneration: number,
    recovering: boolean,
    renderer: OwnedWebGpuRenderer | undefined,
  ): void {
    if (!this.currentGeneration(rendererGeneration)) {
      renderer?.dispose();
      return;
    }
    if (!renderer) {
      this.handleCreationFailure('WebGPU is unavailable in this environment.', recovering);
      return;
    }
    activateOwnedGraphRenderer(this.runtime, renderer);
  }

  private handleCreationError(
    rendererGeneration: number,
    recovering: boolean,
    error: unknown,
  ): void {
    if (!this.currentGeneration(rendererGeneration)) return;
    this.handleCreationFailure(
      error instanceof Error ? error.message : String(error),
      recovering,
    );
  }

  private handleCreationFailure(message: string, recovering: boolean): void {
    if (recovering) this.recoverRenderer(message);
    else reportOwnedGraphRendererError(this.runtime, message, false);
  }

  private handleDeviceLost(rendererGeneration: number, message: string): void {
    if (!this.currentGeneration(rendererGeneration)) return;
    this.recoverRenderer(message || 'The WebGPU device was lost.');
  }

  private handleFrameComplete(rendererGeneration: number): void {
    if (!this.currentGeneration(rendererGeneration)) return;
    this.recoveryAttempts = 0;
    if (this.runtime.frameRequestedRef.current) this.runtime.requestFrameRef.current();
  }

  private recoverRenderer(message: string): void {
    disposeCurrentRenderer(this.runtime);
    pauseOwnedGraphRendererPhysics(this.runtime);
    if (this.recoveryAttempts >= MAX_DEVICE_RECOVERY_ATTEMPTS) {
      reportOwnedGraphRendererError(this.runtime, message, true);
      return;
    }
    this.recoveryAttempts += 1;
    this.runtime.onRecovering();
    this.createRenderer(true);
  }
}

export function startOwnedGraphRendererLifecycle(
  runtime: OwnedGraphRendererLifecycleRuntime,
  canvas: HTMLCanvasElement,
): OwnedGraphRendererLifecycle {
  const lifecycle = new ActiveOwnedGraphRendererLifecycle(runtime, canvas);
  lifecycle.start();
  return lifecycle;
}
