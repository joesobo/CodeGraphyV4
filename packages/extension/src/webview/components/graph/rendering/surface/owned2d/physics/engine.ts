import { DEFAULT_GRAPH_LAYOUT_CONFIG, mergeGraphLayoutConfig } from './config';
import {
  GraphNodeFlag,
  type GraphLayoutConfig,
  type GraphLayoutEngine,
  type GraphLayoutInput,
  type GraphLayoutState,
  type GraphLayoutTickResult,
} from './contracts';
import { applyCollisionForces } from './forces/collision';
import { applyLinkForces } from './forces/link';
import { applyRepulsionForces } from './forces/repulsion';
import { integrateGraphLayout } from './integration';
import { createGraphLayoutState } from './initialization';
import { UniformGrid } from './spatialGrid';

export class TypedGraphLayoutEngine implements GraphLayoutEngine {
  nodeIds: readonly string[] = [];
  private state: GraphLayoutState = createGraphLayoutState({
    nodeIds: [],
    radii: new Float32Array(),
    edgeSources: new Uint32Array(),
    edgeTargets: new Uint32Array(),
  }, { ...DEFAULT_GRAPH_LAYOUT_CONFIG });

  private config: GraphLayoutConfig = { ...DEFAULT_GRAPH_LAYOUT_CONFIG };
  private nodeIndexes = new Map<string, number>();
  private collisionGrid = new UniformGrid(DEFAULT_GRAPH_LAYOUT_CONFIG.initializationSpacing);
  private simulationAlpha = 1;
  private accumulatorMs = 0;
  private settledStepCount = 0;
  private paused = false;
  settled = false;

  constructor(input: GraphLayoutInput, config: Partial<GraphLayoutConfig> = {}) {
    this.setConfig(config);
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
  get targetX(): Float32Array { return this.state.targetX; }
  get targetY(): Float32Array { return this.state.targetY; }
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
    this.state = createGraphLayoutState(input, this.config);
    this.collisionGrid = new UniformGrid(this.collisionCellSize());
    this.reheat();
  }

  setConfig(config: Partial<GraphLayoutConfig>): void {
    this.config = mergeGraphLayoutConfig(this.config, config);
    this.collisionGrid = new UniformGrid(this.collisionCellSize());
    if (this.x.length > 0) this.reheat();
  }

  tick(elapsedMs: number): GraphLayoutTickResult {
    if (this.x.length === 0) {
      this.settled = true;
      return { moving: false, settled: true, steps: 0 };
    }
    if (this.paused) {
      return { moving: !this.settled, settled: this.settled, steps: 0 };
    }
    if (!Number.isFinite(elapsedMs) || elapsedMs < 0) {
      throw new Error('Graph layout elapsed time must be a non-negative finite number');
    }

    this.accumulatorMs += Math.min(elapsedMs, this.config.maximumElapsedMs);
    let steps = 0;
    while (
      this.accumulatorMs + Number.EPSILON >= this.config.fixedTimeStepMs
      && steps < this.config.maximumSubSteps
    ) {
      this.step();
      this.accumulatorMs -= this.config.fixedTimeStepMs;
      steps += 1;
    }
    if (steps === this.config.maximumSubSteps) {
      this.accumulatorMs %= this.config.fixedTimeStepMs;
    }
    return { moving: !this.settled, settled: this.settled, steps };
  }

  setKinematics(
    x: Float32Array,
    y: Float32Array,
    vx: Float32Array,
    vy: Float32Array,
  ): void {
    const nodeCount = this.x.length;
    if ([x, y, vx, vy].some(buffer => buffer.length !== nodeCount)) {
      throw new Error('Graph layout kinematics must match node count');
    }
    this.x.set(x);
    this.y.set(y);
    this.vx.set(vx);
    this.vy.set(vy);
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

  setHidden(index: number, hidden: boolean): void {
    this.assertNodeIndex(index);
    if (hidden) {
      this.flags[index] |= GraphNodeFlag.Hidden;
      this.vx[index] = 0;
      this.vy[index] = 0;
    } else {
      this.flags[index] &= ~GraphNodeFlag.Hidden;
    }
    this.reheat();
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
    applyLinkForces(this.state, this.config, this.simulationAlpha);
    applyRepulsionForces(this.state, this.config, this.simulationAlpha);
    const maximumVelocity = integrateGraphLayout(this.state, this.config, this.simulationAlpha);
    const collisionIterations = this.simulationAlpha < 0.1
      ? Math.max(this.config.collisionIterations, 16)
      : this.config.collisionIterations;
    const collisionCorrectionCount = applyCollisionForces(
      this.state,
      this.config,
      this.collisionGrid,
      collisionIterations,
    );
    this.simulationAlpha = Math.max(
      0,
      this.simulationAlpha * (1 - this.config.alphaDecay),
    );

    const calm = this.simulationAlpha <= this.config.alphaMinimum
      && maximumVelocity <= this.config.settleSpeed
      && collisionCorrectionCount === 0;
    this.settledStepCount = calm ? this.settledStepCount + 1 : 0;
    this.settled = this.settledStepCount >= this.config.settleSteps;
  }

  private collisionCellSize(): number {
    return this.maximumRadius() * 2 + this.config.collisionPadding;
  }

  private maximumRadius(): number {
    let maximumRadius = 1;
    for (const radius of this.radii) maximumRadius = Math.max(maximumRadius, radius);
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
