import {
  createGraphLayoutEngine,
  GraphNodeFlag,
  type GraphLayoutConfig,
  type GraphLayoutEngine,
  type GraphLayoutInput,
  type GraphLayoutTickResult,
} from '../physics';
import GraphLayoutWorker from './worker?worker&inline';
import type { GraphLayoutWorkerCommand, GraphLayoutWorkerMessage } from './protocol';

const FIXED_TICK_MS = 1000 / 60;

function transferableInput(input: GraphLayoutInput): GraphLayoutInput {
  return {
    nodeIds: [...input.nodeIds],
    initialX: input.initialX ? new Float32Array(input.initialX) : undefined,
    initialY: input.initialY ? new Float32Array(input.initialY) : undefined,
    initialVx: input.initialVx ? new Float32Array(input.initialVx) : undefined,
    initialVy: input.initialVy ? new Float32Array(input.initialVy) : undefined,
    chargeStrengthMultipliers: input.chargeStrengthMultipliers
      ? new Float32Array(input.chargeStrengthMultipliers)
      : undefined,
    radii: new Float32Array(input.radii),
    edgeSources: new Uint32Array(input.edgeSources),
    edgeTargets: new Uint32Array(input.edgeTargets),
    flags: input.flags ? new Uint8Array(input.flags) : undefined,
    targetX: input.targetX ? new Float32Array(input.targetX) : undefined,
    targetY: input.targetY ? new Float32Array(input.targetY) : undefined,
  };
}

function inputTransfers(input: GraphLayoutInput): Transferable[] {
  return [
    input.initialX?.buffer,
    input.initialY?.buffer,
    input.initialVx?.buffer,
    input.initialVy?.buffer,
    input.chargeStrengthMultipliers?.buffer,
    input.radii.buffer,
    input.edgeSources.buffer,
    input.edgeTargets.buffer,
    input.flags?.buffer,
    input.targetX?.buffer,
    input.targetY?.buffer,
  ].filter((buffer): buffer is ArrayBuffer => buffer instanceof ArrayBuffer);
}

class WorkerHostedGraphLayoutEngine implements GraphLayoutEngine {
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  settled = false;

  private readonly fallback: GraphLayoutEngine;
  private readonly worker: Worker;
  private disposed = false;
  private failed = false;
  private paused = false;
  private revision = 0;
  private tickInFlight = false;

  constructor(input: GraphLayoutInput, private readonly onUpdate: () => void) {
    this.fallback = createGraphLayoutEngine(input);
    this.x = new Float32Array(this.fallback.x);
    this.y = new Float32Array(this.fallback.y);
    this.vx = new Float32Array(this.fallback.vx);
    this.vy = new Float32Array(this.fallback.vy);
    this.worker = new GraphLayoutWorker();
    this.worker.onmessage = event => this.handleMessage(event.data as GraphLayoutWorkerMessage);
    this.worker.onerror = event => this.fail(event.message || 'Graph layout worker failed');
    const workerInput = transferableInput(input);
    this.post({ type: 'init', input: workerInput, revision: this.revision }, inputTransfers(workerInput));
  }

  get alpha(): number { return this.fallback.alpha; }
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

  setGraph(input: GraphLayoutInput): void {
    this.fallback.setGraph(input);
    this.copyFallbackState();
    this.revision += 1;
    this.tickInFlight = false;
    const workerInput = transferableInput(input);
    this.post({ type: 'init', input: workerInput, revision: this.revision }, inputTransfers(workerInput));
  }

  setConfig(config: Partial<GraphLayoutConfig>): void {
    this.fallback.setConfig(config);
    this.post({ type: 'setConfig', config });
  }

  setKinematics(x: Float32Array, y: Float32Array, vx: Float32Array, vy: Float32Array): void {
    this.fallback.setKinematics(x, y, vx, vy);
    this.x = new Float32Array(x);
    this.y = new Float32Array(y);
    this.vx = new Float32Array(vx);
    this.vy = new Float32Array(vy);
  }

  tick(elapsedMs: number): GraphLayoutTickResult {
    if (this.failed) {
      const result = this.fallback.tick(elapsedMs);
      this.copyFallbackState();
      return result;
    }
    if (!this.paused && !this.settled && !this.tickInFlight) this.postTick(elapsedMs);
    return { moving: !this.settled, settled: this.settled, steps: 0 };
  }

  setNodePosition(index: number, x: number, y: number): void {
    this.fallback.setNodePosition(index, x, y);
    this.x[index] = x;
    this.y[index] = y;
    this.vx[index] = 0;
    this.vy[index] = 0;
    this.settled = false;
    this.post({ type: 'setNodePosition', index, x, y });
  }

  pin(index: number): void {
    this.fallback.pin(index);
    this.flags[index] |= GraphNodeFlag.Pinned;
    this.post({ type: 'pin', index });
  }

  release(index: number): void {
    this.fallback.release(index);
    this.flags[index] &= ~GraphNodeFlag.Pinned;
    this.post({ type: 'release', index });
  }

  setHidden(index: number, hidden: boolean): void {
    this.fallback.setHidden(index, hidden);
    if (hidden) this.flags[index] |= GraphNodeFlag.Hidden;
    else this.flags[index] &= ~GraphNodeFlag.Hidden;
    this.settled = false;
    this.post({ type: 'setHidden', index, hidden });
  }

  reheat(alpha?: number): void {
    this.fallback.reheat(alpha);
    this.settled = false;
    this.post({ type: 'reheat', alpha });
    if (!this.paused && !this.tickInFlight) this.postTick(FIXED_TICK_MS);
  }

  pause(): void {
    this.paused = true;
    this.fallback.pause();
    this.post({ type: 'pause' });
  }

  resume(): void {
    this.paused = false;
    this.fallback.resume();
    this.post({ type: 'resume' });
    if (!this.settled && !this.tickInFlight) this.postTick(FIXED_TICK_MS);
  }

  dispose(): void {
    this.disposed = true;
    this.worker.terminate();
  }

  private post(command: GraphLayoutWorkerCommand, transfer: Transferable[] = []): void {
    if (this.disposed || this.failed) return;
    this.worker.postMessage(command, transfer);
  }

  private postTick(elapsedMs: number): void {
    this.tickInFlight = true;
    this.post({ type: 'tick', elapsedMs, revision: this.revision });
  }

  private handleMessage(message: GraphLayoutWorkerMessage): void {
    if (this.disposed) return;
    if (message.type === 'error') {
      this.fail(message.message);
      return;
    }
    if (message.revision !== this.revision) return;
    const nextX = new Float32Array(message.x);
    const nextY = new Float32Array(message.y);
    const nextVx = new Float32Array(message.vx);
    const nextVy = new Float32Array(message.vy);
    for (let index = 0; index < this.flags.length; index += 1) {
      if ((this.flags[index] & GraphNodeFlag.Pinned) === 0) continue;
      nextX[index] = this.x[index];
      nextY[index] = this.y[index];
      nextVx[index] = 0;
      nextVy[index] = 0;
    }
    this.x = nextX;
    this.y = nextY;
    this.vx = nextVx;
    this.vy = nextVy;
    this.fallback.setKinematics(nextX, nextY, nextVx, nextVy);
    this.settled = message.result.settled;
    this.tickInFlight = false;
    this.onUpdate();
    if (!this.paused && !this.settled) this.postTick(FIXED_TICK_MS);
  }

  private fail(message: string): void {
    if (this.failed || this.disposed) return;
    this.failed = true;
    this.tickInFlight = false;
    this.worker.terminate();
    console.warn('[CodeGraphy] Layout worker failed; using main-thread physics.', message);
    this.onUpdate();
  }

  private copyFallbackState(): void {
    this.x = this.fallback.x;
    this.y = this.fallback.y;
    this.vx = this.fallback.vx;
    this.vy = this.fallback.vy;
    this.settled = this.fallback.settled;
  }
}

export function createWorkerHostedGraphLayoutEngine(
  input: GraphLayoutInput,
  onUpdate: () => void,
): GraphLayoutEngine {
  return new WorkerHostedGraphLayoutEngine(input, onUpdate);
}
