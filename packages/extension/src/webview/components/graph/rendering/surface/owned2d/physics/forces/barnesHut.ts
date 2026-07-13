import type { GraphLayoutState } from '../contracts';
import {
  type BarnesHutDiagnostics,
  EMPTY_BARNES_HUT_INDEX,
  FlatBarnesHutIndex,
} from './barnesHutIndex';
import { isNodeHidden, isNodePinned } from './velocity';

const INITIAL_CAPACITY = 16;
const LCG_MULTIPLIER = 1_664_525;
const LCG_INCREMENT = 1_013_904_223;
const UINT32_RANGE = 4_294_967_296;

export type { BarnesHutDiagnostics } from './barnesHutIndex';

export class FlatBarnesHutTree {
  private readonly index = new FlatBarnesHutIndex();
  private traversalCells = new Int32Array();
  private traversalX = new Float64Array();
  private traversalY = new Float64Array();
  private traversalSize = new Float64Array();
  private randomState = 1;
  private forceDx = 0;
  private forceDy = 0;
  private forceDistanceSquared = 0;

  get cellCount(): number { return this.index.cellCount; }
  get visibleNodeCount(): number { return this.index.visibleNodeCount; }

  rebuild(state: GraphLayoutState, chargeStrength: number): void {
    this.index.rebuild(state, chargeStrength);
  }

  apply(
    state: GraphLayoutState,
    alpha: number,
    theta: number,
    distanceMin: number,
    distanceMax: number,
  ): void {
    if (this.index.root === EMPTY_BARNES_HUT_INDEX) return;
    this.ensureTraversalCapacity(this.index.cellCount);
    const thetaSquared = theta * theta;
    const distanceMinSquared = distanceMin * distanceMin;
    const distanceMaxSquared = distanceMax * distanceMax;
    for (let target = 0; target < state.x.length; target += 1) {
      if (isNodeHidden(state, target) || isNodePinned(state, target)) continue;
      this.applyToTarget(
        state,
        target,
        alpha,
        thetaSquared,
        distanceMinSquared,
        distanceMaxSquared,
      );
    }
  }

  diagnostics(): BarnesHutDiagnostics {
    return this.index.diagnostics();
  }

  private applyToTarget(
    state: GraphLayoutState,
    target: number,
    alpha: number,
    thetaSquared: number,
    distanceMinSquared: number,
    distanceMaxSquared: number,
  ): void {
    let stackLength = 1;
    this.traversalCells[0] = this.index.root;
    this.traversalX[0] = this.index.minimumX;
    this.traversalY[0] = this.index.minimumY;
    this.traversalSize[0] = this.index.size;
    while (stackLength > 0) {
      stackLength -= 1;
      const cell = this.traversalCells[stackLength];
      const open = this.applyCell(
        state,
        target,
        cell,
        stackLength,
        alpha,
        thetaSquared,
        distanceMinSquared,
        distanceMaxSquared,
      );
      if (open) stackLength = this.pushChildren(cell, stackLength);
    }
  }

  private applyCell(
    state: GraphLayoutState,
    target: number,
    cell: number,
    stackIndex: number,
    alpha: number,
    thetaSquared: number,
    distanceMinSquared: number,
    distanceMaxSquared: number,
  ): boolean {
    const charge = this.index.charges[cell];
    if (charge === 0) return false;
    this.forceDx = this.index.chargeX[cell] - state.x[target];
    this.forceDy = this.index.chargeY[cell] - state.y[target];
    this.forceDistanceSquared = this.forceDx * this.forceDx + this.forceDy * this.forceDy;
    const cellSize = this.traversalSize[stackIndex];
    if (cellSize * cellSize / thetaSquared < this.forceDistanceSquared) {
      this.applyAggregate(
        state,
        target,
        charge,
        alpha,
        distanceMinSquared,
        distanceMaxSquared,
      );
      return false;
    }
    if (this.index.internal[cell] !== 0) return true;
    if (this.forceDistanceSquared >= distanceMaxSquared) return false;
    this.applyLeaf(state, target, cell, alpha, distanceMinSquared);
    return false;
  }

  private applyAggregate(
    state: GraphLayoutState,
    target: number,
    charge: number,
    alpha: number,
    distanceMinSquared: number,
    distanceMaxSquared: number,
  ): void {
    if (this.forceDistanceSquared >= distanceMaxSquared) return;
    this.softenCurrentDisplacement(distanceMinSquared);
    state.vx[target] += this.forceDx * charge * alpha / this.forceDistanceSquared;
    state.vy[target] += this.forceDy * charge * alpha / this.forceDistanceSquared;
  }

  private applyLeaf(
    state: GraphLayoutState,
    target: number,
    cell: number,
    alpha: number,
    distanceMinSquared: number,
  ): void {
    const head = this.index.leafHead[cell];
    if (head !== target || this.index.nextCoincident[head] !== EMPTY_BARNES_HUT_INDEX) {
      this.softenCurrentDisplacement(distanceMinSquared);
    }
    for (
      let source = head;
      source !== EMPTY_BARNES_HUT_INDEX;
      source = this.index.nextCoincident[source]
    ) {
      if (source === target) continue;
      const impulse = this.index.strengths[source] * alpha / this.forceDistanceSquared;
      state.vx[target] += this.forceDx * impulse;
      state.vy[target] += this.forceDy * impulse;
    }
  }

  private softenCurrentDisplacement(distanceMinSquared: number): void {
    if (this.forceDx === 0) {
      this.forceDx = this.jiggle();
      this.forceDistanceSquared += this.forceDx * this.forceDx;
    }
    if (this.forceDy === 0) {
      this.forceDy = this.jiggle();
      this.forceDistanceSquared += this.forceDy * this.forceDy;
    }
    if (this.forceDistanceSquared < distanceMinSquared) {
      this.forceDistanceSquared = Math.sqrt(
        distanceMinSquared * this.forceDistanceSquared,
      );
    }
  }

  private pushChildren(cell: number, stackLength: number): number {
    const half = this.traversalSize[stackLength] / 2;
    const cellX = this.traversalX[stackLength];
    const cellY = this.traversalY[stackLength];
    let nextLength = stackLength;
    for (let quadrant = 3; quadrant >= 0; quadrant -= 1) {
      const child = this.index.children[cell * 4 + quadrant];
      if (child === EMPTY_BARNES_HUT_INDEX) continue;
      this.traversalCells[nextLength] = child;
      this.traversalX[nextLength] = cellX + Number((quadrant & 1) !== 0) * half;
      this.traversalY[nextLength] = cellY + Number((quadrant & 2) !== 0) * half;
      this.traversalSize[nextLength] = half;
      nextLength += 1;
    }
    return nextLength;
  }

  private ensureTraversalCapacity(required: number): void {
    if (required <= this.traversalCells.length) return;
    const capacity = nextCapacity(this.traversalCells.length, required);
    this.traversalCells = new Int32Array(capacity);
    this.traversalX = new Float64Array(capacity);
    this.traversalY = new Float64Array(capacity);
    this.traversalSize = new Float64Array(capacity);
  }

  private jiggle(): number {
    this.randomState = (
      Math.imul(LCG_MULTIPLIER, this.randomState) + LCG_INCREMENT
    ) >>> 0;
    return (this.randomState / UINT32_RANGE - 0.5) * 1e-6;
  }
}

function nextCapacity(current: number, required: number): number {
  let capacity = Math.max(INITIAL_CAPACITY, current);
  while (capacity < required) capacity *= 2;
  return capacity;
}
