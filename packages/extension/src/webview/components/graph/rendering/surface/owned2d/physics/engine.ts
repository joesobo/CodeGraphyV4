import { DEFAULT_GRAPH_LAYOUT_CONFIG, mergeGraphLayoutConfig } from './config';
import {
  GraphNodeFlag,
  type GraphLayoutConfig,
  type GraphLayoutEngine,
  type GraphLayoutInput,
  type GraphLayoutState,
  type GraphLayoutTickResult,
} from './contracts';
import { createGraphLayoutState } from './initialization';
import { assertOwnedGraphCollisionScale } from './wasm/configuration';
import { OwnedGraphWasmPhysicsKernel } from './wasm/kernel';

export class TypedGraphLayoutEngine implements GraphLayoutEngine {
  nodeIds!: readonly string[];
  private state!: GraphLayoutState;
  private config: GraphLayoutConfig;
  private collisionScale = 1;
  private maximumCollisionRadius = 1;
  private nodeIndexes!: Map<string, number>;
  private kernel: OwnedGraphWasmPhysicsKernel | undefined;
  private simulationAlpha = 1;
  private simulationAlphaTarget = 0;
  private settledStepCount = 0;
  private paused = false;
  settled = false;

  constructor(input: GraphLayoutInput, config: Partial<GraphLayoutConfig> = {}) {
    this.config = mergeGraphLayoutConfig(DEFAULT_GRAPH_LAYOUT_CONFIG, config);
    this.setGraph(input);
  }

  get x(): Float32Array { return this.state.x; }
  get y(): Float32Array { return this.state.y; }
  get vx(): Float32Array { return this.state.vx; }
  get vy(): Float32Array { return this.state.vy; }
  get chargeStrengthMultipliers(): Float32Array { return this.state.chargeStrengthMultipliers; }
  get radii(): Float32Array { return this.state.radii; }
  get flags(): Uint8Array { return this.state.flags; }
  get edgeSources(): Uint32Array { return this.state.edgeSources; }
  get edgeTargets(): Uint32Array { return this.state.edgeTargets; }
  get alpha(): number { return this.simulationAlpha; }

  getNodeIndex(nodeId: string): number | undefined {
    return this.nodeIndexes.get(nodeId);
  }

  setGraph(input: GraphLayoutInput): void {
    this.nodeIds = [...input.nodeIds];
    this.nodeIndexes = new Map();
    this.nodeIds.forEach((nodeId, index) => {
      if (this.nodeIndexes.has(nodeId)) throw new Error(`Duplicate graph node id: ${nodeId}`);
      this.nodeIndexes.set(nodeId, index);
    });
    const state = createGraphLayoutState(input, this.config);
    const randomState = this.kernel?.randomState ?? 1;
    this.maximumCollisionRadius = this.maximumRadius(state);
    this.kernel = new OwnedGraphWasmPhysicsKernel(
      state,
      this.config,
      this.collisionScale,
      this.collisionCellSize(),
      randomState,
    );
    this.state = this.kernel.state;
    this.reheat();
  }

  setConfig(config: Partial<GraphLayoutConfig>): void {
    this.config = mergeGraphLayoutConfig(this.config, config);
    this.kernel?.configure(this.config, this.collisionScale, this.collisionCellSize());
    if (this.x.length > 0) this.reheat(0.3);
  }

  setCollisionScale(scale: number): void {
    if (scale === this.collisionScale) return;
    assertOwnedGraphCollisionScale(scale);
    const expandsCollisionEnvelope = scale > this.collisionScale;
    this.collisionScale = scale;
    this.kernel?.configure(this.config, scale, this.collisionCellSize());
    if (expandsCollisionEnvelope && this.x.length > 0) {
      this.settled = false;
      this.settledStepCount = 0;
    }
  }

  tick(): GraphLayoutTickResult {
    if (this.x.length === 0) {
      this.settled = true;
      return { moving: false, settled: true, steps: 0 };
    }
    if (this.paused || this.settled) {
      return { moving: false, settled: this.settled, steps: 0 };
    }

    this.step();
    return { moving: !this.settled, settled: this.settled, steps: 1 };
  }

  setKinematics(
    x: Float32Array,
    y: Float32Array,
    vx: Float32Array,
    vy: Float32Array,
  ): void {
    const nodeCount = this.x.length;
    if (x.length !== nodeCount
      || y.length !== nodeCount
      || vx.length !== nodeCount
      || vy.length !== nodeCount) {
      throw new Error('Graph layout kinematics must match node count');
    }
    if (x !== this.x) this.x.set(x);
    if (y !== this.y) this.y.set(y);
    if (vx !== this.vx) this.vx.set(vx);
    if (vy !== this.vy) this.vy.set(vy);
    this.settled = false;
    this.settledStepCount = 0;
  }

  setNodePosition(index: number, x: number, y: number): void {
    this.assertNodeIndex(index);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error('Graph node position must be finite');
    }
    this.x[index] = x;
    this.y[index] = y;
    this.vx[index] = 0;
    this.vy[index] = 0;
    this.settled = false;
  }

  pin(index: number): void {
    this.assertNodeIndex(index);
    this.flags[index] |= GraphNodeFlag.Pinned;
    this.vx[index] = 0;
    this.vy[index] = 0;
  }

  release(index: number): void {
    this.assertNodeIndex(index);
    this.flags[index] &= ~GraphNodeFlag.Pinned;
  }

  setAlphaTarget(alpha: number): void {
    if (!Number.isFinite(alpha) || alpha < 0) {
      throw new Error('Graph layout alpha target must be a non-negative finite number');
    }
    this.simulationAlphaTarget = alpha;
    if (alpha > 0) {
      this.settled = false;
      this.settledStepCount = 0;
    }
  }

  reheat(alpha = 1): void {
    if (!Number.isFinite(alpha) || alpha <= 0) {
      throw new Error('Graph layout reheat alpha must be positive');
    }
    this.simulationAlpha = Math.max(this.simulationAlpha, alpha);
    this.settled = false;
    this.settledStepCount = 0;
  }

  pause(): void { this.paused = true; }
  resume(): void { this.paused = false; }

  private step(): void {
    this.simulationAlpha += (this.simulationAlphaTarget - this.simulationAlpha)
      * this.config.alphaDecay;
    const collisionIterations = this.simulationAlpha < 0.1
      ? Math.max(this.config.collisionIterations, 16)
      : this.config.collisionIterations;
    if (!this.kernel) throw new Error('Owned graph WASM physics kernel is unavailable');
    const maximumVelocity = this.kernel.step(
      this.simulationAlpha,
      collisionIterations,
    );
    this.state = this.kernel.state;
    const collisionCorrectionCount = this.kernel.collisionCorrectionCount;
    const calm = this.simulationAlpha <= this.config.alphaMinimum
      && maximumVelocity <= this.config.settleSpeed
      && collisionCorrectionCount === 0;
    this.settledStepCount = calm ? this.settledStepCount + 1 : 0;
    this.settled = this.settledStepCount >= this.config.settleSteps;
  }

  private collisionCellSize(): number {
    return this.maximumCollisionRadius * 2 * this.collisionScale
      + this.config.collisionPadding;
  }

  private maximumRadius(state: GraphLayoutState): number {
    let maximumRadius = 1;
    for (const radius of state.radii) maximumRadius = Math.max(maximumRadius, radius);
    return maximumRadius;
  }

  private assertNodeIndex(index: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.x.length) {
      throw new Error(`Graph node index is out of bounds: ${index}`);
    }
  }
}

export function createGraphLayoutEngine(
  input: GraphLayoutInput,
  config: Partial<GraphLayoutConfig> = {},
): GraphLayoutEngine {
  return new TypedGraphLayoutEngine(input, config);
}
