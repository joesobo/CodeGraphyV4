import type { MutableRefObject } from 'react';
import type { OwnedGraphLayout } from '../../layout/runtime/model';
import type { GraphLayoutFixedTimestepClock } from '../../simulation/timing/clock';
import { WebGpuGraphRenderer } from '@codegraphy-dev/graph-renderer';
import {
  activateOwnedGraphRenderer,
  disposeCurrentRenderer,
  reportOwnedGraphRendererError,
} from './activation';
import { beginOwnedWebGpuRendererCreation } from '../creation/start';
import { currentRendererGeneration, finishOwnedRendererFrame, rendererDeviceLostMessage } from './generation';
import { createdRendererResult, rendererCreationError } from '../creation/result';
import { recoverOwnedGraphRenderer } from './recovery';

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
  onFrameComplete(this: void, submissionId: number): void;
  onFrameRejected(this: void, submissionId: number): void;
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
      onFrameComplete: submissionId => this.handleFrameComplete(rendererGeneration, submissionId),
      onFrameRejected: submissionId => this.handleFrameRejected(rendererGeneration, submissionId),
      onRendererError: message => this.handleRendererError(rendererGeneration, message),
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

  private handleRendererError(rendererGeneration: number, message: string): void {
    if (!this.currentGeneration(rendererGeneration)) return;
    this.recoverRenderer(message);
  }

  private handleFrameComplete(rendererGeneration: number, submissionId: number): void {
    if (!this.currentGeneration(rendererGeneration)) return;
    this.recoveryAttempts = 0;
    this.runtime.onFrameComplete(submissionId);
    finishOwnedRendererFrame(this.runtime);
  }

  private handleFrameRejected(rendererGeneration: number, submissionId: number): void {
    if (!this.currentGeneration(rendererGeneration)) return;
    this.runtime.onFrameRejected(submissionId);
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
