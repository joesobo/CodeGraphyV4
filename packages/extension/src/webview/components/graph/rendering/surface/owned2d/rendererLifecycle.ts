import type { MutableRefObject } from 'react';
import type { OwnedGraphLayout } from './layout';
import type { GraphLayoutFixedTimestepClock } from './simulationClock';
import { WebGpuGraphRenderer } from '@codegraphy-dev/graph-renderer';
import {
  activateOwnedGraphRenderer,
  disposeCurrentRenderer,
  reportOwnedGraphRendererError,
} from './rendererActivation';
import { beginOwnedWebGpuRendererCreation } from './rendererCreation';
import { currentRendererGeneration, finishOwnedRendererFrame, rendererDeviceLostMessage } from './rendererGeneration';
import { createdRendererResult, rendererCreationError } from './rendererCreationResult';
import { recoverOwnedGraphRenderer } from './rendererRecovery';

export type OwnedGraphRendererStatus = 'error' | 'initializing' | 'webgpu';

export interface OwnedGraphRendererLifecycleRuntime {
  engineStopNotifiedRef: MutableRefObject<boolean>;
  frameRequestedRef: MutableRefObject<boolean>;
  gpuRendererRef: MutableRefObject<WebGpuGraphRenderer | null>;
  layoutRef: MutableRefObject<OwnedGraphLayout | null>;
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
    beginOwnedWebGpuRendererCreation(this.canvas, {
      onDeviceLost: message => this.handleDeviceLost(rendererGeneration, message),
      onFrameComplete: () => this.handleFrameComplete(rendererGeneration),
      onCreated: renderer => this.handleCreatedRenderer(rendererGeneration, recovering, renderer),
      onCreationError: error => this.handleCreationError(rendererGeneration, recovering, error),
    });
  }

  private currentGeneration(rendererGeneration: number): boolean {
    return currentRendererGeneration(this.active, this.generation, rendererGeneration);
  }

  private handleCreatedRenderer(
    rendererGeneration: number,
    recovering: boolean,
    renderer: WebGpuGraphRenderer | undefined,
  ): void {
    const result = createdRendererResult(this.currentGeneration(rendererGeneration), renderer);
    if (result === 'stale') return;
    if (result === 'unavailable') {
      this.handleCreationFailure('WebGPU is unavailable in this environment.', recovering);
      return;
    }
    activateOwnedGraphRenderer(this.runtime, result);
  }

  private handleCreationError(
    rendererGeneration: number,
    recovering: boolean,
    error: unknown,
  ): void {
    const message = rendererCreationError(this.currentGeneration(rendererGeneration), error);
    if (message !== undefined) this.handleCreationFailure(message, recovering);
  }

  private handleCreationFailure(message: string, recovering: boolean): void {
    if (recovering) this.recoverRenderer(message);
    else reportOwnedGraphRendererError(this.runtime, message, false);
  }

  private handleDeviceLost(rendererGeneration: number, message: string): void {
    if (!this.currentGeneration(rendererGeneration)) return;
    this.recoverRenderer(rendererDeviceLostMessage(message));
  }

  private handleFrameComplete(rendererGeneration: number): void {
    if (!this.currentGeneration(rendererGeneration)) return;
    this.recoveryAttempts = 0;
    finishOwnedRendererFrame(this.runtime);
  }

  private recoverRenderer(message: string): void {
    this.recoveryAttempts = recoverOwnedGraphRenderer(
      this.runtime, message, this.recoveryAttempts, () => this.createRenderer(true),
    );
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
