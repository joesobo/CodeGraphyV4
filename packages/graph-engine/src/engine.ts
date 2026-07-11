import { UniformGrid } from './grid';

export enum GraphNodeFlag {
  Pinned = 1 << 0,
  Hidden = 1 << 1,
}

export interface GraphLayoutInput {
  nodeIds: readonly string[];
  initialX?: Float32Array;
  initialY?: Float32Array;
  radii: Float32Array;
  edgeSources: Uint32Array;
  edgeTargets: Uint32Array;
  flags?: Uint8Array;
  targetX?: Float32Array;
  targetY?: Float32Array;
}

export interface GraphLayoutConfig {
  alphaDecay: number;
  alphaMinimum: number;
  centerForce: number;
  collisionIterations: number;
  collisionPadding: number;
  collisionStrength: number;
  constraintForce: number;
  damping: number;
  fixedTimeStepMs: number;
  initializationSpacing: number;
  linkDistance: number;
  linkForce: number;
  maximumCollisionNeighbors: number;
  maximumElapsedMs: number;
  maximumNeighbors: number;
  maximumSpeed: number;
  maximumSubSteps: number;
  repelForce: number;
  settleSpeed: number;
  settleSteps: number;
}

export interface GraphLayoutTickResult {
  moving: boolean;
  settled: boolean;
  steps: number;
}

export interface GraphLayoutEngine {
  readonly nodeIds: readonly string[];
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly vx: Float32Array;
  readonly vy: Float32Array;
  readonly radii: Float32Array;
  readonly flags: Uint8Array;
  readonly edgeSources: Uint32Array;
  readonly edgeTargets: Uint32Array;
  readonly targetX: Float32Array;
  readonly targetY: Float32Array;
  readonly settled: boolean;
  getNodeIndex(nodeId: string): number | undefined;
  setGraph(input: GraphLayoutInput): void;
  setConfig(config: Partial<GraphLayoutConfig>): void;
  tick(elapsedMs: number): GraphLayoutTickResult;
  setNodePosition(index: number, x: number, y: number): void;
  pin(index: number): void;
  release(index: number): void;
  setHidden(index: number, hidden: boolean): void;
  reheat(alpha?: number): void;
  pause(): void;
  resume(): void;
  dispose?(): void;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const BASE_FRAME_MS = 1000 / 60;

export const DEFAULT_GRAPH_LAYOUT_CONFIG: Readonly<GraphLayoutConfig> = {
  alphaDecay: 0.025,
  alphaMinimum: 0.001,
  centerForce: 0.12,
  collisionIterations: 1,
  collisionPadding: 2,
  collisionStrength: 0.7,
  constraintForce: 0.12,
  damping: 0.84,
  fixedTimeStepMs: BASE_FRAME_MS,
  initializationSpacing: 12,
  linkDistance: 80,
  linkForce: 0.08,
  maximumCollisionNeighbors: 64,
  maximumElapsedMs: 250,
  maximumNeighbors: 24,
  maximumSpeed: 80,
  maximumSubSteps: 2,
  repelForce: 1_200,
  settleSpeed: 0.02,
  settleSteps: 8,
};

function assertBufferLength(
  buffer: { length: number } | undefined,
  expected: number,
  label: string,
): void {
  if (buffer && buffer.length !== expected) {
    throw new Error(`${label} length must match node count`);
  }
}

function deterministicDirection(first: number, second: number): { x: number; y: number } {
  const hash = Math.imul(first + 1, 73_856_093) ^ Math.imul(second + 1, 19_349_663);
  const angle = ((hash >>> 0) / 4_294_967_296) * Math.PI * 2;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

class TypedGraphLayoutEngine implements GraphLayoutEngine {
  nodeIds: readonly string[] = [];
  x = new Float32Array();
  y = new Float32Array();
  vx = new Float32Array();
  vy = new Float32Array();
  radii = new Float32Array();
  flags = new Uint8Array();
  edgeSources = new Uint32Array();
  edgeTargets = new Uint32Array();
  targetX = new Float32Array();
  targetY = new Float32Array();

  private config: GraphLayoutConfig = { ...DEFAULT_GRAPH_LAYOUT_CONFIG };
  private nodeIndexes = new Map<string, number>();
  private collisionGrid = new UniformGrid(DEFAULT_GRAPH_LAYOUT_CONFIG.initializationSpacing);
  private grid = new UniformGrid(DEFAULT_GRAPH_LAYOUT_CONFIG.linkDistance);
  private alpha = 1;
  private accumulatorMs = 0;
  private settledStepCount = 0;
  private paused = false;
  settled = false;

  constructor(input: GraphLayoutInput, config: Partial<GraphLayoutConfig> = {}) {
    this.setConfig(config);
    this.setGraph(input);
  }

  getNodeIndex(nodeId: string): number | undefined {
    return this.nodeIndexes.get(nodeId);
  }

  setGraph(input: GraphLayoutInput): void {
    const nodeCount = input.nodeIds.length;
    assertBufferLength(input.initialX, nodeCount, 'initialX');
    assertBufferLength(input.initialY, nodeCount, 'initialY');
    assertBufferLength(input.radii, nodeCount, 'radii');
    assertBufferLength(input.flags, nodeCount, 'flags');
    assertBufferLength(input.targetX, nodeCount, 'targetX');
    assertBufferLength(input.targetY, nodeCount, 'targetY');
    if (input.edgeSources.length !== input.edgeTargets.length) {
      throw new Error('edge source and target buffers must have equal lengths');
    }

    this.nodeIds = [...input.nodeIds];
    this.nodeIndexes = new Map();
    this.nodeIds.forEach((nodeId, index) => {
      if (this.nodeIndexes.has(nodeId)) throw new Error(`Duplicate graph node id: ${nodeId}`);
      this.nodeIndexes.set(nodeId, index);
    });
    this.x = new Float32Array(nodeCount);
    this.y = new Float32Array(nodeCount);
    this.vx = new Float32Array(nodeCount);
    this.vy = new Float32Array(nodeCount);
    this.radii = new Float32Array(nodeCount);
    this.flags = input.flags ? new Uint8Array(input.flags) : new Uint8Array(nodeCount);
    this.targetX = input.targetX
      ? new Float32Array(input.targetX)
      : new Float32Array(nodeCount).fill(Number.NaN);
    this.targetY = input.targetY
      ? new Float32Array(input.targetY)
      : new Float32Array(nodeCount).fill(Number.NaN);

    for (let index = 0; index < nodeCount; index += 1) {
      const suppliedX = input.initialX?.[index];
      const suppliedY = input.initialY?.[index];
      if (Number.isFinite(suppliedX) && Number.isFinite(suppliedY)) {
        this.x[index] = suppliedX as number;
        this.y[index] = suppliedY as number;
      } else {
        const radius = this.config.initializationSpacing * Math.sqrt(index + 1);
        const angle = index * GOLDEN_ANGLE;
        this.x[index] = Math.cos(angle) * radius;
        this.y[index] = Math.sin(angle) * radius;
      }
      const suppliedRadius = input.radii[index];
      this.radii[index] = Number.isFinite(suppliedRadius) && suppliedRadius > 0
        ? suppliedRadius
        : 1;
    }

    this.edgeSources = new Uint32Array(input.edgeSources);
    this.edgeTargets = new Uint32Array(input.edgeTargets);
    for (let edge = 0; edge < this.edgeSources.length; edge += 1) {
      if (this.edgeSources[edge] >= nodeCount || this.edgeTargets[edge] >= nodeCount) {
        throw new Error(`Edge ${edge} references a missing node`);
      }
    }
    this.grid = new UniformGrid(this.gridCellSize());
    this.collisionGrid = new UniformGrid(this.collisionCellSize());
    this.rebuildGrid();
    this.reheat();
  }

  setConfig(config: Partial<GraphLayoutConfig>): void {
    const next = { ...this.config, ...config };
    for (const [key, value] of Object.entries(next)) {
      if (!Number.isFinite(value)) throw new Error(`Graph layout config ${key} must be finite`);
    }
    if (next.fixedTimeStepMs <= 0 || next.linkDistance <= 0 || next.maximumSpeed <= 0) {
      throw new Error('Graph layout time step, link distance, and maximum speed must be positive');
    }
    if (next.damping < 0 || next.damping > 1) {
      throw new Error('Graph layout damping must be between zero and one');
    }
    this.config = next;
    this.grid = new UniformGrid(this.gridCellSize());
    this.collisionGrid = new UniformGrid(this.collisionCellSize());
  }

  tick(elapsedMs: number): GraphLayoutTickResult {
    if (this.paused || this.x.length === 0) {
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
    this.alpha = Math.max(this.alpha, alpha);
    this.settled = false;
    this.settledStepCount = 0;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  private step(): void {
    this.rebuildGrid();
    this.applyLinkForces();
    this.applyLocalForces();
    this.applyCollisionForces();
    const maximumVelocity = this.integrate();
    this.alpha = Math.max(0, this.alpha * (1 - this.config.alphaDecay));

    const calm = this.alpha <= this.config.alphaMinimum
      && maximumVelocity <= this.config.settleSpeed;
    this.settledStepCount = calm ? this.settledStepCount + 1 : 0;
    this.settled = this.settledStepCount >= this.config.settleSteps;
  }

  private applyLinkForces(): void {
    for (let edge = 0; edge < this.edgeSources.length; edge += 1) {
      const source = this.edgeSources[edge];
      const target = this.edgeTargets[edge];
      if (this.isHidden(source) || this.isHidden(target)) continue;
      let dx = this.x[target] - this.x[source];
      let dy = this.y[target] - this.y[source];
      let distanceSquared = dx * dx + dy * dy;
      if (distanceSquared < 0.0001) {
        const direction = deterministicDirection(source, target);
        dx = direction.x * 0.01;
        dy = direction.y * 0.01;
        distanceSquared = dx * dx + dy * dy;
      }
      const distance = Math.sqrt(distanceSquared);
      const impulse = (distance - this.config.linkDistance)
        * this.config.linkForce
        * this.alpha
        * 0.01;
      const forceX = (dx / distance) * impulse;
      const forceY = (dy / distance) * impulse;
      this.applyVelocityPair(source, target, forceX, forceY);
    }
  }

  private applyLocalForces(): void {
    for (let index = 0; index < this.x.length; index += 1) {
      if (this.isHidden(index)) continue;
      this.grid.forEachNearby(index, this.config.maximumNeighbors, (otherIndex) => {
        if (otherIndex <= index || this.isHidden(otherIndex)) return;
        this.applyNodePair(index, otherIndex);
      });
    }
  }

  private applyNodePair(first: number, second: number): void {
    let dx = this.x[second] - this.x[first];
    let dy = this.y[second] - this.y[first];
    let distanceSquared = dx * dx + dy * dy;
    if (distanceSquared < 0.0001) {
      const direction = deterministicDirection(first, second);
      dx = direction.x * 0.01;
      dy = direction.y * 0.01;
      distanceSquared = dx * dx + dy * dy;
    }
    const distance = Math.sqrt(distanceSquared);
    const repelImpulse = Math.min(
      this.config.maximumSpeed,
      (this.config.repelForce * this.alpha) / Math.max(distanceSquared, 25),
    );
    const forceX = (dx / distance) * repelImpulse;
    const forceY = (dy / distance) * repelImpulse;
    this.applyVelocityPair(first, second, -forceX, -forceY);
  }

  private applyCollisionForces(): void {
    this.collisionGrid.rebuild(this.x, this.y, this.flags, GraphNodeFlag.Hidden);
    for (let iteration = 0; iteration < this.config.collisionIterations; iteration += 1) {
      for (let index = 0; index < this.x.length; index += 1) {
        if (this.isHidden(index)) continue;
        this.collisionGrid.forEachNearby(
          index,
          this.config.maximumCollisionNeighbors,
          otherIndex => {
            if (otherIndex <= index || this.isHidden(otherIndex)) return;
            this.applyCollisionPair(index, otherIndex);
          },
        );
      }
    }
  }

  private applyCollisionPair(first: number, second: number): void {
    let dx = this.x[second] - this.x[first];
    let dy = this.y[second] - this.y[first];
    let distanceSquared = dx * dx + dy * dy;
    if (distanceSquared < 0.0001) {
      const direction = deterministicDirection(first, second);
      dx = direction.x * 0.01;
      dy = direction.y * 0.01;
      distanceSquared = dx * dx + dy * dy;
    }
    const distance = Math.sqrt(distanceSquared);
    const minimumDistance = this.radii[first]
      + this.radii[second]
      + this.config.collisionPadding;
    if (distance >= minimumDistance) return;
    const collisionAlpha = Math.max(this.alpha, 0.2);
    const impulse = (minimumDistance - distance)
      * this.config.collisionStrength
      * collisionAlpha
      * 0.5;
    const forceX = (dx / distance) * impulse;
    const forceY = (dy / distance) * impulse;
    this.applyVelocityPair(first, second, -forceX, -forceY);
  }

  private applyVelocityPair(
    first: number,
    second: number,
    forceX: number,
    forceY: number,
  ): void {
    if (!this.isPinned(first)) {
      this.vx[first] += forceX;
      this.vy[first] += forceY;
    }
    if (!this.isPinned(second)) {
      this.vx[second] -= forceX;
      this.vy[second] -= forceY;
    }
  }

  private integrate(): number {
    const timeScale = this.config.fixedTimeStepMs / BASE_FRAME_MS;
    let maximumVelocity = 0;

    for (let index = 0; index < this.x.length; index += 1) {
      if (this.isPinned(index) || this.isHidden(index)) {
        this.vx[index] = 0;
        this.vy[index] = 0;
        continue;
      }
      this.vx[index] += -this.x[index] * this.config.centerForce * this.alpha * 0.001;
      this.vy[index] += -this.y[index] * this.config.centerForce * this.alpha * 0.001;
      const constraintAlpha = Math.max(this.alpha, 0.1);
      if (Number.isFinite(this.targetX[index])) {
        this.vx[index] += (this.targetX[index] - this.x[index])
          * this.config.constraintForce
          * constraintAlpha;
      }
      if (Number.isFinite(this.targetY[index])) {
        this.vy[index] += (this.targetY[index] - this.y[index])
          * this.config.constraintForce
          * constraintAlpha;
      }
      this.vx[index] *= this.config.damping;
      this.vy[index] *= this.config.damping;

      const speed = Math.hypot(this.vx[index], this.vy[index]);
      if (speed > this.config.maximumSpeed) {
        const scale = this.config.maximumSpeed / speed;
        this.vx[index] *= scale;
        this.vy[index] *= scale;
      }
      this.x[index] += this.vx[index] * timeScale;
      this.y[index] += this.vy[index] * timeScale;
      this.recoverFinitePosition(index);
      maximumVelocity = Math.max(
        maximumVelocity,
        Math.hypot(this.vx[index], this.vy[index]),
      );
    }
    return maximumVelocity;
  }

  private recoverFinitePosition(index: number): void {
    if (
      Number.isFinite(this.x[index])
      && Number.isFinite(this.y[index])
      && Number.isFinite(this.vx[index])
      && Number.isFinite(this.vy[index])
    ) return;
    const radius = this.config.initializationSpacing * Math.sqrt(index + 1);
    const angle = index * GOLDEN_ANGLE;
    this.x[index] = Math.cos(angle) * radius;
    this.y[index] = Math.sin(angle) * radius;
    this.vx[index] = 0;
    this.vy[index] = 0;
  }

  private rebuildGrid(): void {
    this.grid.rebuild(this.x, this.y, this.flags, GraphNodeFlag.Hidden);
  }

  private collisionCellSize(): number {
    let maximumRadius = 1;
    for (const radius of this.radii) maximumRadius = Math.max(maximumRadius, radius);
    return maximumRadius * 2 + this.config.collisionPadding;
  }

  private gridCellSize(): number {
    let maximumRadius = 1;
    for (const radius of this.radii) maximumRadius = Math.max(maximumRadius, radius);
    return Math.max(this.config.linkDistance, maximumRadius * 2 + this.config.collisionPadding);
  }

  private isPinned(index: number): boolean {
    return (this.flags[index] & GraphNodeFlag.Pinned) !== 0;
  }

  private isHidden(index: number): boolean {
    return (this.flags[index] & GraphNodeFlag.Hidden) !== 0;
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
