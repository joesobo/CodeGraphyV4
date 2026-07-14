import {
  GraphNodeFlag,
  type GraphLayoutConfig,
  type GraphLayoutEngine,
  type GraphLayoutInput,
  type GraphLayoutPerformanceSample,
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
import type { OwnedGraphStageAttributionProfiler } from '../performance/attribution';
import { GraphLayoutSnapshotInterpolator } from './snapshotInterpolator';
import {
  createGraphLayoutTransferBufferPair,
  graphLayoutInputTransfers,
  graphLayoutOutputTransfers,
  transferableGraphLayoutInput,
} from './transferBuffers';

const PENDING_MUTATION_REVISION = 0xffff_ffff;

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
  private directPositionRevision: Uint32Array;
  private disposed = false;
  private failed = false;
  private mutationRevision = 0;
  private paused = false;
  private performanceSample: GraphLayoutPerformanceSample | undefined;
  private readonly pendingNodePositions = new Map<number, { x: number; y: number }>();
  private kinematicsBuffersCreated = false;
  private kinematicsPending = false;
  private readonly pendingRecycle: GraphLayoutTransferBuffers[] = [];
  private interpolator: GraphLayoutSnapshotInterpolator;
  private revision = 0;
  private structuralRevision = 0;
  private tickInFlight = false;
  private tickStartedAt: number | null = null;

  constructor(
    input: GraphLayoutInput,
    private readonly onUpdate: () => void,
    private readonly onFrameRequest: () => void,
    private readonly attributionProfiler?: OwnedGraphStageAttributionProfiler,
  ) {
    this.fallback = createGraphLayoutEngine(input);
    this.currentAlpha = this.fallback.alpha;
    this.x = new Float32Array(this.fallback.x);
    this.y = new Float32Array(this.fallback.y);
    this.vx = new Float32Array(this.fallback.vx);
    this.vy = new Float32Array(this.fallback.vy);
    this.directPositionRevision = new Uint32Array(this.x.length);
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

  consumePerformanceSample(): GraphLayoutPerformanceSample | undefined {
    if (this.failed) return this.fallback.consumePerformanceSample?.();
    const sample = this.performanceSample;
    this.performanceSample = undefined;
    return sample;
  }

  sampleRenderPositions(timestamp: number): GraphLayoutRenderSample {
    return this.interpolator.sample(timestamp, this.flags, this.failed);
  }

  setGraph(input: GraphLayoutInput): void {
    this.fallback.setGraph(input);
    this.copyFallbackState();
    this.revision += 1;
    this.mutationRevision = 0;
    this.structuralRevision = 0;
    this.directPositionRevision = new Uint32Array(this.x.length);
    this.tickInFlight = false;
    this.tickStartedAt = null;
    this.performanceSample = undefined;
    this.currentBuffers = undefined;
    this.pendingRecycle.length = 0;
    this.pendingNodePositions.clear();
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
    this.structuralRevision += 1;
    this.post({
      type: 'setConfig',
      config,
      mutationRevision: this.mutationRevision,
      structuralRevision: this.structuralRevision,
    });
  }

  setKinematics(x: Float32Array, y: Float32Array, vx: Float32Array, vy: Float32Array): void {
    this.pendingNodePositions.clear();
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
    this.directPositionRevision.fill(this.mutationRevision);
    this.postKinematics();
  }

  tick(): GraphLayoutTickResult {
    if (this.failed) {
      const result = this.fallback.tick();
      this.copyFallbackState();
      return result;
    }
    this.flushNodePositions();
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
    if (this.failed) return;
    this.directPositionRevision[index] = PENDING_MUTATION_REVISION;
    this.pendingNodePositions.set(index, { x, y });
  }

  pin(index: number): void {
    this.fallback.pin(index);
    this.mutationRevision += 1;
    this.post({ type: 'pin', index, mutationRevision: this.mutationRevision });
  }

  release(index: number): void {
    this.flushNodePositions();
    this.fallback.release(index);
    this.mutationRevision += 1;
    this.post({ type: 'release', index, mutationRevision: this.mutationRevision });
  }

  setHidden(index: number, hidden: boolean): void {
    this.fallback.setHidden(index, hidden);
    this.settled = false;
    this.mutationRevision += 1;
    this.structuralRevision += 1;
    this.post({
      type: 'setHidden',
      index,
      hidden,
      mutationRevision: this.mutationRevision,
      structuralRevision: this.structuralRevision,
    });
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

  private flushNodePositions(): void {
    if (this.pendingNodePositions.size === 0 || this.disposed || this.failed) return;
    this.mutationRevision += 1;
    const mutationRevision = this.mutationRevision;
    const positions = Array.from(
      this.pendingNodePositions,
      ([index, position]) => ({ index, x: position.x, y: position.y }),
    );
    for (const position of positions) {
      this.directPositionRevision[position.index] = mutationRevision;
    }
    this.post({ type: 'setNodePositions', mutationRevision, positions });
    this.pendingNodePositions.clear();
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
    this.tickStartedAt = performance.now();
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
    const completedAt = performance.now();
    this.tickInFlight = false;
    this.performanceSample = {
      roundTripMs: this.tickStartedAt === null
        ? 0
        : Math.max(0, completedAt - this.tickStartedAt),
      simulationCpuMs: Number.isFinite(message.simulationCpuMs)
        ? Math.max(0, message.simulationCpuMs)
        : 0,
      steps: message.result.steps,
    };
    this.tickStartedAt = null;
    if (message.structuralRevision !== this.structuralRevision) {
      this.recycleRejectedTick(message);
      return;
    }
    const snapshotApplyStartedAt = this.attributionProfiler?.startTiming() ?? null;
    this.applyTickMetadata(message);
    if (message.result.steps === 0) {
      this.recycleRejectedTick(message);
      return;
    }
    const nextX = new Float32Array(message.buffers.x);
    const nextY = new Float32Array(message.buffers.y);
    const nextVx = new Float32Array(message.buffers.vx);
    const nextVy = new Float32Array(message.buffers.vy);
    this.preserveAuthoritativeKinematics(message, nextX, nextY, nextVx, nextVy);
    this.interpolator.accept(nextX, nextY, completedAt);
    this.recycleCurrentBuffers();
    this.currentBuffers = message.buffers;
    this.x = nextX;
    this.y = nextY;
    this.vx = nextVx;
    this.vy = nextVy;
    this.onUpdate();
    this.attributionProfiler?.finishTiming('snapshotApply', snapshotApplyStartedAt);
  }

  private applyTickMetadata(message: GraphLayoutWorkerTickMessage): void {
    if (message.mutationRevision === this.mutationRevision) {
      this.currentAlpha = message.alpha;
      this.settled = message.result.settled;
    } else {
      this.settled = false;
    }
  }

  private preserveAuthoritativeKinematics(
    message: GraphLayoutWorkerTickMessage,
    nextX: Float32Array,
    nextY: Float32Array,
    nextVx: Float32Array,
    nextVy: Float32Array,
  ): void {
    for (const [index, flag] of this.flags.entries()) {
      const directlyMovedAfterTick = this.directPositionRevision[index]
        > message.mutationRevision;
      const pinned = (flag & GraphNodeFlag.Pinned) !== 0;
      if (!directlyMovedAfterTick && !pinned) continue;
      nextX[index] = this.x[index];
      nextY[index] = this.y[index];
      nextVx[index] = pinned ? 0 : this.vx[index];
      nextVy[index] = pinned ? 0 : this.vy[index];
    }
  }

  private recycleRejectedTick(message: GraphLayoutWorkerTickMessage): void {
    this.pendingRecycle.push(message.buffers);
    this.onFrameRequest();
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
    this.tickStartedAt = null;
    this.performanceSample = undefined;
    this.worker.terminate();
    this.fallback.setKinematics(this.x, this.y, this.vx, this.vy);
    this.fallback.setAlpha(this.currentAlpha);
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
  attributionProfiler?: OwnedGraphStageAttributionProfiler,
): GraphLayoutEngine {
  return new WorkerHostedGraphLayoutEngine(
    input,
    onUpdate,
    onFrameRequest,
    attributionProfiler,
  );
}
