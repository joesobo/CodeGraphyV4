import {
  GraphNodeFlag,
  type GraphLayoutConfig,
  type GraphLayoutEngine,
  type GraphLayoutInput,
  type GraphLayoutRenderSample,
  type GraphLayoutTickResult,
} from '../physics/contracts';
import { createGraphLayoutEngine } from '../physics/engine';
import GraphLayoutWorker from './worker?worker&inline';
import type {
  GraphLayoutTransferBuffers,
  GraphLayoutWorkerCommand,
  GraphLayoutWorkerKinematicsBuffersMessage,
  GraphLayoutWorkerMessage,
  GraphLayoutWorkerTickMessage,
} from './protocol';
import { transferBufferList } from './protocol';
import { GraphLayoutSnapshotInterpolator } from './snapshotInterpolator';
import {
  createGraphLayoutTransferBufferPair,
  graphLayoutInputTransfers,
  graphLayoutOutputTransfers,
  transferableGraphLayoutInput,
} from './transferBuffers';

class WorkerHostedGraphLayoutEngine implements GraphLayoutEngine {
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  settled = false;

  private readonly fallback: GraphLayoutEngine;
  private readonly worker: Worker;
  private availableKinematicsBuffers: GraphLayoutTransferBuffers[] = [];
  private currentAlpha: number;
  private currentBuffers: GraphLayoutTransferBuffers | undefined;
  private disposed = false;
  private failed = false;
  private mutationRevision = 0;
  private paused = false;
  private kinematicsBuffersCreated = false;
  private kinematicsPending = false;
  private readonly pendingRecycle: GraphLayoutTransferBuffers[] = [];
  private interpolator: GraphLayoutSnapshotInterpolator;
  private revision = 0;
  private tickInFlight = false;

  constructor(
    input: GraphLayoutInput,
    private readonly onUpdate: () => void,
    private readonly onFrameRequest: () => void,
  ) {
    this.fallback = createGraphLayoutEngine(input);
    this.currentAlpha = this.fallback.alpha;
    this.x = new Float32Array(this.fallback.x);
    this.y = new Float32Array(this.fallback.y);
    this.vx = new Float32Array(this.fallback.vx);
    this.vy = new Float32Array(this.fallback.vy);
    this.interpolator = new GraphLayoutSnapshotInterpolator(
      this.x,
      this.y,
      performance.now(),
    );
    this.worker = new GraphLayoutWorker();
    this.worker.onmessage = event => this.handleMessage(event.data as GraphLayoutWorkerMessage);
    this.worker.onerror = event => this.fail(event.message || 'Graph layout worker failed');
    this.initializeWorker(input);
  }

  get alpha(): number { return this.failed ? this.fallback.alpha : this.currentAlpha; }
  get nodeIds(): readonly string[] { return this.fallback.nodeIds; }
  get chargeStrengthMultipliers(): Float32Array { return this.fallback.chargeStrengthMultipliers; }
  get radii(): Float32Array { return this.fallback.radii; }
  get flags(): Uint8Array { return this.fallback.flags; }
  get edgeSources(): Uint32Array { return this.fallback.edgeSources; }
  get edgeTargets(): Uint32Array { return this.fallback.edgeTargets; }
  get targetX(): Float32Array { return this.fallback.targetX; }
  get targetY(): Float32Array { return this.fallback.targetY; }

  getNodeIndex(nodeId: string): number | undefined {
    return this.fallback.getNodeIndex(nodeId);
  }

  sampleRenderPositions(timestamp: number): GraphLayoutRenderSample {
    return this.interpolator.sample(timestamp, this.flags, this.failed);
  }

  setGraph(input: GraphLayoutInput): void {
    this.fallback.setGraph(input);
    this.copyFallbackState();
    this.revision += 1;
    this.mutationRevision = 0;
    this.tickInFlight = false;
    this.currentBuffers = undefined;
    this.pendingRecycle.length = 0;
    this.availableKinematicsBuffers = [];
    this.kinematicsBuffersCreated = false;
    this.kinematicsPending = false;
    this.interpolator.reset(this.x, this.y, performance.now());
    this.initializeWorker(input);
  }

  setConfig(config: Partial<GraphLayoutConfig>): void {
    this.fallback.setConfig(config);
    if (this.x.length > 0) this.currentAlpha = Math.max(this.currentAlpha, 0.3);
    this.settled = false;
    this.mutationRevision += 1;
    this.post({ type: 'setConfig', config, mutationRevision: this.mutationRevision });
  }

  setKinematics(x: Float32Array, y: Float32Array, vx: Float32Array, vy: Float32Array): void {
    if (this.failed) {
      this.fallback.setKinematics(x, y, vx, vy);
      this.copyFallbackState();
      return;
    }
    this.x.set(x);
    this.y.set(y);
    this.vx.set(vx);
    this.vy.set(vy);
    this.settled = false;
    this.interpolator.reset(this.x, this.y, performance.now());
    this.mutationRevision += 1;
    this.postKinematics();
  }

  tick(): GraphLayoutTickResult {
    if (this.failed) {
      const result = this.fallback.tick();
      this.copyFallbackState();
      return result;
    }
    if (!this.paused && !this.settled && !this.tickInFlight && !this.kinematicsPending) {
      this.postTick();
    }
    return { moving: false, settled: this.settled, steps: 0 };
  }

  setNodePosition(index: number, x: number, y: number): void {
    this.fallback.setNodePosition(index, x, y);
    this.x[index] = x;
    this.y[index] = y;
    this.vx[index] = 0;
    this.vy[index] = 0;
    this.interpolator.directPosition(index, x, y);
    this.settled = false;
    this.mutationRevision += 1;
    this.post({
      type: 'setNodePosition',
      index,
      mutationRevision: this.mutationRevision,
      x,
      y,
    });
  }

  pin(index: number): void {
    this.fallback.pin(index);
    this.flags[index] |= GraphNodeFlag.Pinned;
    this.mutationRevision += 1;
    this.post({ type: 'pin', index, mutationRevision: this.mutationRevision });
  }

  release(index: number): void {
    this.fallback.release(index);
    this.flags[index] &= ~GraphNodeFlag.Pinned;
    this.mutationRevision += 1;
    this.post({ type: 'release', index, mutationRevision: this.mutationRevision });
  }

  setHidden(index: number, hidden: boolean): void {
    this.fallback.setHidden(index, hidden);
    if (hidden) this.flags[index] |= GraphNodeFlag.Hidden;
    else this.flags[index] &= ~GraphNodeFlag.Hidden;
    this.settled = false;
    this.mutationRevision += 1;
    this.post({ type: 'setHidden', index, hidden, mutationRevision: this.mutationRevision });
  }

  setAlpha(alpha: number): void {
    this.fallback.setAlpha(alpha);
    this.currentAlpha = alpha;
    this.mutationRevision += 1;
    this.post({ type: 'setAlpha', alpha, mutationRevision: this.mutationRevision });
  }

  setAlphaTarget(alpha: number): void {
    this.fallback.setAlphaTarget(alpha);
    this.settled = false;
    this.mutationRevision += 1;
    this.post({ type: 'setAlphaTarget', alpha, mutationRevision: this.mutationRevision });
  }

  reheat(alpha?: number): void {
    this.fallback.reheat(alpha);
    this.currentAlpha = Math.max(this.currentAlpha, alpha ?? 1);
    this.settled = false;
    this.mutationRevision += 1;
    this.post({ type: 'reheat', alpha, mutationRevision: this.mutationRevision });
  }

  pause(): void {
    this.paused = true;
    this.fallback.pause();
    this.mutationRevision += 1;
    this.post({ type: 'pause', mutationRevision: this.mutationRevision });
  }

  resume(): void {
    this.paused = false;
    this.fallback.resume();
    this.mutationRevision += 1;
    this.post({ type: 'resume', mutationRevision: this.mutationRevision });
  }

  dispose(): void {
    this.disposed = true;
    this.worker.terminate();
  }

  private initializeWorker(input: GraphLayoutInput): void {
    const workerInput = transferableGraphLayoutInput(input);
    const outputBuffers = createGraphLayoutTransferBufferPair(input.nodeIds.length);
    this.post({
      type: 'init',
      input: workerInput,
      outputBuffers,
      revision: this.revision,
    }, [
      ...graphLayoutInputTransfers(workerInput),
      ...graphLayoutOutputTransfers(outputBuffers),
    ]);
  }

  private post(command: GraphLayoutWorkerCommand, transfer: Transferable[] = []): void {
    if (this.disposed || this.failed) return;
    this.worker.postMessage(command, transfer);
  }

  private postKinematics(): void {
    if (!this.kinematicsBuffersCreated) {
      this.availableKinematicsBuffers = createGraphLayoutTransferBufferPair(this.x.length);
      this.kinematicsBuffersCreated = true;
    }
    const buffers = this.availableKinematicsBuffers.shift();
    if (!buffers) {
      this.kinematicsPending = true;
      return;
    }
    this.kinematicsPending = false;
    new Float32Array(buffers.x).set(this.x);
    new Float32Array(buffers.y).set(this.y);
    new Float32Array(buffers.vx).set(this.vx);
    new Float32Array(buffers.vy).set(this.vy);
    this.post({
      buffers,
      mutationRevision: this.mutationRevision,
      revision: this.revision,
      type: 'setKinematics',
    }, transferBufferList(buffers));
  }

  private postTick(): void {
    const recycledBuffers = this.pendingRecycle.splice(0);
    this.tickInFlight = true;
    this.post({
      type: 'tick',
      recycledBuffers: recycledBuffers.length > 0 ? recycledBuffers : undefined,
      revision: this.revision,
    }, graphLayoutOutputTransfers(recycledBuffers));
  }

  private handleMessage(message: GraphLayoutWorkerMessage): void {
    if (this.disposed || this.failed) return;
    if (message.type === 'error') {
      if (message.revision === this.revision) this.fail(message.message);
    } else if (message.type === 'kinematicsBuffers') {
      this.handleKinematicsBuffers(message);
    } else {
      this.handleTickMessage(message);
    }
  }

  private handleKinematicsBuffers(message: GraphLayoutWorkerKinematicsBuffersMessage): void {
    if (message.revision !== this.revision) return;
    this.availableKinematicsBuffers.push(message.buffers);
    if (!this.kinematicsPending) return;
    this.postKinematics();
    this.onFrameRequest();
  }

  private handleTickMessage(message: GraphLayoutWorkerTickMessage): void {
    if (message.revision !== this.revision) return;
    this.tickInFlight = false;
    if (message.mutationRevision !== this.mutationRevision) {
      this.pendingRecycle.push(message.buffers);
      this.onFrameRequest();
      return;
    }
    this.currentAlpha = message.alpha;
    this.settled = message.result.settled;
    if (message.result.steps === 0) {
      this.pendingRecycle.push(message.buffers);
      this.onFrameRequest();
      return;
    }
    const nextX = new Float32Array(message.buffers.x);
    const nextY = new Float32Array(message.buffers.y);
    const nextVx = new Float32Array(message.buffers.vx);
    const nextVy = new Float32Array(message.buffers.vy);
    for (let index = 0; index < this.flags.length; index += 1) {
      if ((this.flags[index] & GraphNodeFlag.Pinned) === 0) continue;
      nextX[index] = this.x[index];
      nextY[index] = this.y[index];
      nextVx[index] = 0;
      nextVy[index] = 0;
    }
    this.interpolator.accept(nextX, nextY, performance.now());
    this.recycleCurrentBuffers();
    this.currentBuffers = message.buffers;
    this.x = nextX;
    this.y = nextY;
    this.vx = nextVx;
    this.vy = nextVy;
    this.onUpdate();
  }

  private recycleCurrentBuffers(): void {
    if (!this.currentBuffers) return;
    this.pendingRecycle.push(this.currentBuffers);
    this.currentBuffers = undefined;
  }

  private fail(message: string): void {
    if (this.failed || this.disposed) return;
    this.failed = true;
    this.tickInFlight = false;
    this.worker.terminate();
    this.fallback.setKinematics(this.x, this.y, this.vx, this.vy);
    this.fallback.setAlpha(this.currentAlpha);
    if (this.paused) this.fallback.pause();
    console.warn('[CodeGraphy] Layout worker failed; using main-thread physics.', message);
    this.onUpdate();
  }

  private copyFallbackState(): void {
    this.currentAlpha = this.fallback.alpha;
    this.x = this.fallback.x;
    this.y = this.fallback.y;
    this.vx = this.fallback.vx;
    this.vy = this.fallback.vy;
    this.settled = this.fallback.settled;
    this.interpolator.authoritativeChanged(this.x, this.y);
  }
}

export function createWorkerHostedGraphLayoutEngine(
  input: GraphLayoutInput,
  onUpdate: () => void,
  onFrameRequest: () => void = onUpdate,
): GraphLayoutEngine {
  return new WorkerHostedGraphLayoutEngine(input, onUpdate, onFrameRequest);
}
