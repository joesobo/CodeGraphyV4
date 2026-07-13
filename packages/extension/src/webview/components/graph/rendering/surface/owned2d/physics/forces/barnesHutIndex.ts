import type { GraphLayoutState } from '../contracts';
import { isNodeHidden } from './velocity';

export const EMPTY_BARNES_HUT_INDEX = -1;
const INITIAL_CAPACITY = 16;

export interface BarnesHutDiagnostics {
  cellCount: number;
  rootBounds: { minimumX: number; minimumY: number; size: number } | undefined;
  rootCharge: number;
  rootChargeX: number;
  rootChargeY: number;
  visibleNodeCount: number;
}

export class FlatBarnesHutIndex {
  cellCount = 0;
  children = new Int32Array();
  internal = new Uint8Array();
  leafHead = new Int32Array();
  nextCoincident = new Int32Array();
  strengths = new Float64Array();
  charges = new Float64Array();
  chargeX = new Float64Array();
  chargeY = new Float64Array();
  root = EMPTY_BARNES_HUT_INDEX;
  minimumX = 0;
  minimumY = 0;
  size = 0;
  visibleNodeCount = 0;

  private cellCapacity = 0;
  private maximumX = 0;
  private maximumY = 0;
  private buildStack = new Int32Array();
  private buildTraversalCells = new Int32Array();
  private insertionMinimumX = 0;
  private insertionMinimumY = 0;
  private insertionSize = 0;

  rebuild(state: GraphLayoutState, chargeStrength: number): void {
    this.resetBuild(state.x.length);
    if (!this.scanVisibleNodes(state, chargeStrength)) return;
    this.initializeExtent();
    this.root = this.allocateCell();
    this.insertVisibleNodes(state);
    this.accumulate(state.x, state.y);
  }

  diagnostics(): BarnesHutDiagnostics {
    return {
      cellCount: this.cellCount,
      rootBounds: this.root === EMPTY_BARNES_HUT_INDEX
        ? undefined
        : { minimumX: this.minimumX, minimumY: this.minimumY, size: this.size },
      rootCharge: this.root === EMPTY_BARNES_HUT_INDEX ? 0 : this.charges[this.root],
      rootChargeX: this.root === EMPTY_BARNES_HUT_INDEX
        ? Number.NaN
        : this.chargeX[this.root],
      rootChargeY: this.root === EMPTY_BARNES_HUT_INDEX
        ? Number.NaN
        : this.chargeY[this.root],
      visibleNodeCount: this.visibleNodeCount,
    };
  }

  private resetBuild(nodeCount: number): void {
    this.root = EMPTY_BARNES_HUT_INDEX;
    this.cellCount = 0;
    this.visibleNodeCount = 0;
    this.minimumX = Number.POSITIVE_INFINITY;
    this.minimumY = Number.POSITIVE_INFINITY;
    this.maximumX = Number.NEGATIVE_INFINITY;
    this.maximumY = Number.NEGATIVE_INFINITY;
    this.ensureNodeCapacity(nodeCount);
    this.nextCoincident.fill(EMPTY_BARNES_HUT_INDEX, 0, nodeCount);
  }

  private scanVisibleNodes(state: GraphLayoutState, chargeStrength: number): boolean {
    for (let index = 0; index < state.x.length; index += 1) {
      if (isNodeHidden(state, index)) continue;
      const x = state.x[index];
      const y = state.y[index];
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      this.minimumX = Math.min(this.minimumX, x);
      this.minimumY = Math.min(this.minimumY, y);
      this.maximumX = Math.max(this.maximumX, x);
      this.maximumY = Math.max(this.maximumY, y);
      this.strengths[index] = chargeStrength * state.chargeStrengthMultipliers[index];
      this.visibleNodeCount += 1;
    }
    return this.visibleNodeCount > 0;
  }

  private initializeExtent(): void {
    this.minimumX = Math.floor(this.minimumX);
    this.minimumY = Math.floor(this.minimumY);
    this.size = 1;
    while (
      this.maximumX >= this.minimumX + this.size
      || this.maximumY >= this.minimumY + this.size
    ) this.size *= 2;
  }

  private insertVisibleNodes(state: GraphLayoutState): void {
    for (let index = 0; index < state.x.length; index += 1) {
      if (isNodeHidden(state, index)) continue;
      const x = state.x[index];
      const y = state.y[index];
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      this.insert(index, x, y, state.x, state.y);
    }
  }

  private insert(
    nodeIndex: number,
    x: number,
    y: number,
    positionsX: Float32Array,
    positionsY: Float32Array,
  ): void {
    const cell = this.findInsertionCell(nodeIndex, x, y);
    if (cell === EMPTY_BARNES_HUT_INDEX) return;
    const existingHead = this.leafHead[cell];
    if (existingHead === EMPTY_BARNES_HUT_INDEX) {
      this.leafHead[cell] = nodeIndex;
      return;
    }
    const existingX = positionsX[existingHead];
    const existingY = positionsY[existingHead];
    if (x === existingX && y === existingY) {
      this.nextCoincident[nodeIndex] = existingHead;
      this.leafHead[cell] = nodeIndex;
      return;
    }
    this.leafHead[cell] = EMPTY_BARNES_HUT_INDEX;
    this.internal[cell] = 1;
    this.splitLeaf(cell, nodeIndex, x, y, existingHead, existingX, existingY);
  }

  private findInsertionCell(nodeIndex: number, x: number, y: number): number {
    let cell = this.root;
    this.insertionMinimumX = this.minimumX;
    this.insertionMinimumY = this.minimumY;
    this.insertionSize = this.size;
    while (this.internal[cell] !== 0) {
      const half = this.insertionSize / 2;
      const quadrant = quadrantAt(
        x,
        y,
        this.insertionMinimumX + half,
        this.insertionMinimumY + half,
      );
      this.insertionMinimumX += (quadrant & 1) * half;
      this.insertionMinimumY += (quadrant >> 1) * half;
      this.insertionSize = half;
      const child = this.children[cell * 4 + quadrant];
      if (child === EMPTY_BARNES_HUT_INDEX) {
        const leaf = this.createLeaf(nodeIndex);
        this.children[cell * 4 + quadrant] = leaf;
        return EMPTY_BARNES_HUT_INDEX;
      }
      cell = child;
    }
    return cell;
  }

  private splitLeaf(
    initialCell: number,
    nodeIndex: number,
    x: number,
    y: number,
    existingHead: number,
    existingX: number,
    existingY: number,
  ): void {
    let cell = initialCell;
    while (true) {
      const half = this.insertionSize / 2;
      const midpointX = this.insertionMinimumX + half;
      const midpointY = this.insertionMinimumY + half;
      const quadrant = quadrantAt(x, y, midpointX, midpointY);
      const existingQuadrant = quadrantAt(existingX, existingY, midpointX, midpointY);
      if (quadrant !== existingQuadrant) {
        const existingLeaf = this.createLeaf(existingHead);
        const newLeaf = this.createLeaf(nodeIndex);
        this.children[cell * 4 + existingQuadrant] = existingLeaf;
        this.children[cell * 4 + quadrant] = newLeaf;
        return;
      }
      const child = this.allocateCell();
      this.internal[child] = 1;
      this.children[cell * 4 + quadrant] = child;
      cell = child;
      this.insertionMinimumX += (quadrant & 1) * half;
      this.insertionMinimumY += (quadrant >> 1) * half;
      this.insertionSize = half;
    }
  }

  private createLeaf(nodeIndex: number): number {
    const leaf = this.allocateCell();
    this.leafHead[leaf] = nodeIndex;
    return leaf;
  }

  private accumulate(positionsX: Float32Array, positionsY: Float32Array): void {
    const orderLength = this.collectBuildOrder();
    for (let order = orderLength - 1; order >= 0; order -= 1) {
      const cell = this.buildStack[order];
      if (this.internal[cell] === 0) {
        this.accumulateLeaf(cell, positionsX, positionsY);
      } else {
        this.accumulateInternal(cell);
      }
    }
  }

  private collectBuildOrder(): number {
    this.ensureBuildStackCapacity(this.cellCount);
    let stackLength = 1;
    let orderLength = 0;
    this.buildTraversalCells[0] = this.root;
    while (stackLength > 0) {
      stackLength -= 1;
      const cell = this.buildTraversalCells[stackLength];
      this.buildStack[orderLength] = cell;
      orderLength += 1;
      if (this.internal[cell] === 0) continue;
      for (let quadrant = 0; quadrant < 4; quadrant += 1) {
        const child = this.children[cell * 4 + quadrant];
        if (child === EMPTY_BARNES_HUT_INDEX) continue;
        this.buildTraversalCells[stackLength] = child;
        stackLength += 1;
      }
    }
    return orderLength;
  }

  private accumulateLeaf(
    cell: number,
    positionsX: Float32Array,
    positionsY: Float32Array,
  ): void {
    const head = this.leafHead[cell];
    this.chargeX[cell] = positionsX[head];
    this.chargeY[cell] = positionsY[head];
    let charge = 0;
    for (
      let node = head;
      node !== EMPTY_BARNES_HUT_INDEX;
      node = this.nextCoincident[node]
    ) charge += this.strengths[node];
    this.charges[cell] = charge;
  }

  private accumulateInternal(cell: number): void {
    let charge = 0;
    let weight = 0;
    let weightedX = 0;
    let weightedY = 0;
    for (let quadrant = 0; quadrant < 4; quadrant += 1) {
      const child = this.children[cell * 4 + quadrant];
      if (child === EMPTY_BARNES_HUT_INDEX) continue;
      const childWeight = Math.abs(this.charges[child]);
      if (childWeight === 0) continue;
      charge += this.charges[child];
      weight += childWeight;
      weightedX += childWeight * this.chargeX[child];
      weightedY += childWeight * this.chargeY[child];
    }
    this.charges[cell] = charge;
    this.chargeX[cell] = weightedX / weight;
    this.chargeY[cell] = weightedY / weight;
  }

  private allocateCell(): number {
    this.ensureCellCapacity(this.cellCount + 1);
    const cell = this.cellCount;
    this.cellCount += 1;
    this.internal[cell] = 0;
    this.leafHead[cell] = EMPTY_BARNES_HUT_INDEX;
    this.charges[cell] = 0;
    this.chargeX[cell] = Number.NaN;
    this.chargeY[cell] = Number.NaN;
    this.children.fill(EMPTY_BARNES_HUT_INDEX, cell * 4, cell * 4 + 4);
    return cell;
  }

  private ensureCellCapacity(required: number): void {
    if (required <= this.cellCapacity) return;
    const capacity = nextCapacity(this.cellCapacity, required);
    this.children = growInt32(this.children, capacity * 4, EMPTY_BARNES_HUT_INDEX);
    this.internal = growUint8(this.internal, capacity);
    this.leafHead = growInt32(this.leafHead, capacity, EMPTY_BARNES_HUT_INDEX);
    this.charges = growFloat64(this.charges, capacity);
    this.chargeX = growFloat64(this.chargeX, capacity);
    this.chargeY = growFloat64(this.chargeY, capacity);
    this.cellCapacity = capacity;
  }

  private ensureNodeCapacity(required: number): void {
    if (required <= this.nextCoincident.length) return;
    const capacity = nextCapacity(this.nextCoincident.length, required);
    this.nextCoincident = growInt32(
      this.nextCoincident,
      capacity,
      EMPTY_BARNES_HUT_INDEX,
    );
    this.strengths = growFloat64(this.strengths, capacity);
  }

  private ensureBuildStackCapacity(required: number): void {
    if (required <= this.buildStack.length) return;
    const capacity = nextCapacity(this.buildStack.length, required);
    this.buildStack = new Int32Array(capacity);
    this.buildTraversalCells = new Int32Array(capacity);
  }
}

function nextCapacity(current: number, required: number): number {
  let capacity = Math.max(INITIAL_CAPACITY, current);
  while (capacity < required) capacity *= 2;
  return capacity;
}

function quadrantAt(x: number, y: number, midpointX: number, midpointY: number): number {
  return Number(y >= midpointY) * 2 + Number(x >= midpointX);
}

function growInt32(
  current: Int32Array<ArrayBuffer>,
  length: number,
  fill: number,
): Int32Array<ArrayBuffer> {
  const next = new Int32Array(length);
  next.fill(fill);
  next.set(current);
  return next;
}

function growUint8(
  current: Uint8Array<ArrayBuffer>,
  length: number,
): Uint8Array<ArrayBuffer> {
  const next = new Uint8Array(length);
  next.set(current);
  return next;
}

function growFloat64(
  current: Float64Array<ArrayBuffer>,
  length: number,
): Float64Array<ArrayBuffer> {
  const next = new Float64Array(length);
  next.set(current);
  return next;
}
