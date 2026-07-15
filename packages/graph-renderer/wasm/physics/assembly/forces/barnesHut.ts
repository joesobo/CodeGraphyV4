import {
  isFiniteNumber,
  isHidden,
  isPinned,
  multiplier,
  nodeCount,
  setVx,
  setVy,
  vx,
  vy,
  x,
  y,
} from '../memory';

const EMPTY_INDEX: i32 = -1;
const UINT32_RANGE: f64 = 4_294_967_296.0;

let childrenPointer: usize = 0;
let internalPointer: usize = 0;
let leafHeadPointer: usize = 0;
let nextCoincidentPointer: usize = 0;
let strengthPointer: usize = 0;
let chargePointer: usize = 0;
let chargeXPointer: usize = 0;
let chargeYPointer: usize = 0;
let buildStackPointer: usize = 0;
let buildTraversalPointer: usize = 0;
let traversalCellPointer: usize = 0;
let traversalXPointer: usize = 0;
let traversalYPointer: usize = 0;
let traversalSizePointer: usize = 0;
let cellCapacity: i32 = 0;

let cellCount = 0;
let visibleNodeCount = 0;
let root = EMPTY_INDEX;
let minimumX: f64 = 0;
let minimumY: f64 = 0;
let maximumX: f64 = 0;
let maximumY: f64 = 0;
let rootSize: f64 = 0;
let insertionMinimumX: f64 = 0;
let insertionMinimumY: f64 = 0;
let insertionSize: f64 = 0;
let randomState: u32 = 1;
let overflowed = false;
let forceDx: f64 = 0;
let forceDy: f64 = 0;
let forceDistanceSquared: f64 = 0;

export function initializeBarnesHut(
  nextChildrenPointer: usize,
  nextInternalPointer: usize,
  nextLeafHeadPointer: usize,
  nextCoincidentNodePointer: usize,
  nextStrengthPointer: usize,
  nextChargePointer: usize,
  nextChargeXPointer: usize,
  nextChargeYPointer: usize,
  nextBuildStackPointer: usize,
  nextBuildTraversalPointer: usize,
  nextTraversalCellPointer: usize,
  nextTraversalXPointer: usize,
  nextTraversalYPointer: usize,
  nextTraversalSizePointer: usize,
  nextCellCapacity: i32,
): void {
  childrenPointer = nextChildrenPointer;
  internalPointer = nextInternalPointer;
  leafHeadPointer = nextLeafHeadPointer;
  nextCoincidentPointer = nextCoincidentNodePointer;
  strengthPointer = nextStrengthPointer;
  chargePointer = nextChargePointer;
  chargeXPointer = nextChargeXPointer;
  chargeYPointer = nextChargeYPointer;
  buildStackPointer = nextBuildStackPointer;
  buildTraversalPointer = nextBuildTraversalPointer;
  traversalCellPointer = nextTraversalCellPointer;
  traversalXPointer = nextTraversalXPointer;
  traversalYPointer = nextTraversalYPointer;
  traversalSizePointer = nextTraversalSizePointer;
  cellCapacity = nextCellCapacity;
}

@inline
function child(cell: i32, quadrant: i32): i32 {
  return load<i32>(childrenPointer + (<usize>(cell * 4 + quadrant) << 2));
}

@inline
function setChild(cell: i32, quadrant: i32, value: i32): void {
  store<i32>(childrenPointer + (<usize>(cell * 4 + quadrant) << 2), value);
}

@inline
function internal(cell: i32): bool {
  return load<u8>(internalPointer + <usize>cell) != 0;
}

@inline
function setInternal(cell: i32, value: bool): void {
  store<u8>(internalPointer + <usize>cell, value ? 1 : 0);
}

@inline
function leafHead(cell: i32): i32 {
  return load<i32>(leafHeadPointer + (<usize>cell << 2));
}

@inline
function setLeafHead(cell: i32, value: i32): void {
  store<i32>(leafHeadPointer + (<usize>cell << 2), value);
}

@inline
function nextCoincident(node: i32): i32 {
  return load<i32>(nextCoincidentPointer + (<usize>node << 2));
}

@inline
function setNextCoincident(node: i32, value: i32): void {
  store<i32>(nextCoincidentPointer + (<usize>node << 2), value);
}

@inline
function strength(node: i32): f64 {
  return load<f64>(strengthPointer + (<usize>node << 3));
}

@inline
function setStrength(node: i32, value: f64): void {
  store<f64>(strengthPointer + (<usize>node << 3), value);
}

@inline
function charge(cell: i32): f64 {
  return load<f64>(chargePointer + (<usize>cell << 3));
}

@inline
function setCharge(cell: i32, value: f64): void {
  store<f64>(chargePointer + (<usize>cell << 3), value);
}

@inline
function chargeX(cell: i32): f64 {
  return load<f64>(chargeXPointer + (<usize>cell << 3));
}

@inline
function setChargeX(cell: i32, value: f64): void {
  store<f64>(chargeXPointer + (<usize>cell << 3), value);
}

@inline
function chargeY(cell: i32): f64 {
  return load<f64>(chargeYPointer + (<usize>cell << 3));
}

@inline
function setChargeY(cell: i32, value: f64): void {
  store<f64>(chargeYPointer + (<usize>cell << 3), value);
}

@inline
function buildStack(index: i32): i32 {
  return load<i32>(buildStackPointer + (<usize>index << 2));
}

@inline
function setBuildStack(index: i32, value: i32): void {
  store<i32>(buildStackPointer + (<usize>index << 2), value);
}

@inline
function buildTraversal(index: i32): i32 {
  return load<i32>(buildTraversalPointer + (<usize>index << 2));
}

@inline
function setBuildTraversal(index: i32, value: i32): void {
  store<i32>(buildTraversalPointer + (<usize>index << 2), value);
}

@inline
function traversalCell(index: i32): i32 {
  return load<i32>(traversalCellPointer + (<usize>index << 2));
}

@inline
function setTraversalCell(index: i32, value: i32): void {
  store<i32>(traversalCellPointer + (<usize>index << 2), value);
}

@inline
function traversalX(index: i32): f64 {
  return load<f64>(traversalXPointer + (<usize>index << 3));
}

@inline
function setTraversalX(index: i32, value: f64): void {
  store<f64>(traversalXPointer + (<usize>index << 3), value);
}

@inline
function traversalY(index: i32): f64 {
  return load<f64>(traversalYPointer + (<usize>index << 3));
}

@inline
function setTraversalY(index: i32, value: f64): void {
  store<f64>(traversalYPointer + (<usize>index << 3), value);
}

@inline
function traversalSize(index: i32): f64 {
  return load<f64>(traversalSizePointer + (<usize>index << 3));
}

@inline
function setTraversalSize(index: i32, value: f64): void {
  store<f64>(traversalSizePointer + (<usize>index << 3), value);
}

export function rebuildBarnesHut(globalChargeStrength: f64): bool {
  resetBuild();
  if (!scanVisibleNodes(globalChargeStrength)) return true;
  initializeExtent();
  root = allocateCell();
  if (overflowed) return false;
  insertVisibleNodes();
  if (overflowed) return false;
  accumulate();
  return true;
}

function resetBuild(): void {
  root = EMPTY_INDEX;
  cellCount = 0;
  visibleNodeCount = 0;
  minimumX = Infinity;
  minimumY = Infinity;
  maximumX = -Infinity;
  maximumY = -Infinity;
  overflowed = false;
}

function scanVisibleNodes(globalChargeStrength: f64): bool {
  for (let index = 0; index < nodeCount; index += 1) {
    if (isHidden(index)) continue;
    setNextCoincident(index, EMPTY_INDEX);
    const currentX = x(index);
    const currentY = y(index);
    if (!isFiniteNumber(currentX) || !isFiniteNumber(currentY)) continue;
    minimumX = Math.min(minimumX, currentX);
    minimumY = Math.min(minimumY, currentY);
    maximumX = Math.max(maximumX, currentX);
    maximumY = Math.max(maximumY, currentY);
    setStrength(index, globalChargeStrength * multiplier(index));
    visibleNodeCount += 1;
  }
  return visibleNodeCount > 0;
}

function initializeExtent(): void {
  minimumX = Math.floor(minimumX);
  minimumY = Math.floor(minimumY);
  rootSize = 1;
  while (
    maximumX >= minimumX + rootSize
    || maximumY >= minimumY + rootSize
  ) rootSize *= 2;
}

function insertVisibleNodes(): void {
  for (let index = 0; index < nodeCount; index += 1) {
    if (isHidden(index)) continue;
    const currentX = x(index);
    const currentY = y(index);
    if (!isFiniteNumber(currentX) || !isFiniteNumber(currentY)) continue;
    insert(index, currentX, currentY);
    if (overflowed) return;
  }
}

function insert(nodeIndex: i32, nodeX: f64, nodeY: f64): void {
  const cell = findInsertionCell(nodeIndex, nodeX, nodeY);
  if (cell == EMPTY_INDEX) return;
  const existingHead = leafHead(cell);
  if (existingHead == EMPTY_INDEX) {
    setLeafHead(cell, nodeIndex);
    return;
  }
  const existingX = x(existingHead);
  const existingY = y(existingHead);
  if (nodeX == existingX && nodeY == existingY) {
    setNextCoincident(nodeIndex, existingHead);
    setLeafHead(cell, nodeIndex);
    return;
  }
  setLeafHead(cell, EMPTY_INDEX);
  setInternal(cell, true);
  splitLeaf(cell, nodeIndex, nodeX, nodeY, existingHead, existingX, existingY);
}

function findInsertionCell(nodeIndex: i32, nodeX: f64, nodeY: f64): i32 {
  let cell = root;
  insertionMinimumX = minimumX;
  insertionMinimumY = minimumY;
  insertionSize = rootSize;
  while (internal(cell)) {
    const half = insertionSize / 2;
    const quadrant = quadrantAt(
      nodeX,
      nodeY,
      insertionMinimumX + half,
      insertionMinimumY + half,
    );
    insertionMinimumX += <f64>(quadrant & 1) * half;
    insertionMinimumY += <f64>(quadrant >> 1) * half;
    insertionSize = half;
    const nextCell = child(cell, quadrant);
    if (nextCell == EMPTY_INDEX) {
      const leaf = createLeaf(nodeIndex);
      if (!overflowed) setChild(cell, quadrant, leaf);
      return EMPTY_INDEX;
    }
    cell = nextCell;
  }
  return cell;
}

function splitLeaf(
  initialCell: i32,
  nodeIndex: i32,
  nodeX: f64,
  nodeY: f64,
  existingHead: i32,
  existingX: f64,
  existingY: f64,
): void {
  let cell = initialCell;
  while (!overflowed) {
    const half = insertionSize / 2;
    const midpointX = insertionMinimumX + half;
    const midpointY = insertionMinimumY + half;
    const quadrant = quadrantAt(nodeX, nodeY, midpointX, midpointY);
    const existingQuadrant = quadrantAt(existingX, existingY, midpointX, midpointY);
    if (quadrant != existingQuadrant) {
      const existingLeaf = createLeaf(existingHead);
      const newLeaf = createLeaf(nodeIndex);
      if (overflowed) return;
      setChild(cell, existingQuadrant, existingLeaf);
      setChild(cell, quadrant, newLeaf);
      return;
    }
    const nextCell = allocateCell();
    if (overflowed) return;
    setInternal(nextCell, true);
    setChild(cell, quadrant, nextCell);
    cell = nextCell;
    insertionMinimumX += <f64>(quadrant & 1) * half;
    insertionMinimumY += <f64>(quadrant >> 1) * half;
    insertionSize = half;
  }
}

function createLeaf(nodeIndex: i32): i32 {
  const leaf = allocateCell();
  if (!overflowed) setLeafHead(leaf, nodeIndex);
  return leaf;
}

function allocateCell(): i32 {
  if (cellCount >= cellCapacity) {
    overflowed = true;
    return EMPTY_INDEX;
  }
  const cell = cellCount;
  cellCount += 1;
  setInternal(cell, false);
  setLeafHead(cell, EMPTY_INDEX);
  setCharge(cell, 0);
  setChargeX(cell, NaN);
  setChargeY(cell, NaN);
  memory.fill(childrenPointer + <usize>(cell * 16), 0xff, 16);
  return cell;
}

function accumulate(): void {
  const orderLength = collectBuildOrder();
  for (let order = orderLength - 1; order >= 0; order -= 1) {
    const cell = buildStack(order);
    if (internal(cell)) accumulateInternal(cell);
    else accumulateLeaf(cell);
  }
}

function collectBuildOrder(): i32 {
  let stackLength = 1;
  let orderLength = 0;
  setBuildTraversal(0, root);
  while (stackLength > 0) {
    stackLength -= 1;
    const cell = buildTraversal(stackLength);
    setBuildStack(orderLength, cell);
    orderLength += 1;
    if (!internal(cell)) continue;
    for (let quadrant = 0; quadrant < 4; quadrant += 1) {
      const nextCell = child(cell, quadrant);
      if (nextCell == EMPTY_INDEX) continue;
      setBuildTraversal(stackLength, nextCell);
      stackLength += 1;
    }
  }
  return orderLength;
}

function accumulateLeaf(cell: i32): void {
  const head = leafHead(cell);
  setChargeX(cell, x(head));
  setChargeY(cell, y(head));
  let totalCharge: f64 = 0;
  let node = head;
  while (node != EMPTY_INDEX) {
    totalCharge += strength(node);
    node = nextCoincident(node);
  }
  setCharge(cell, totalCharge);
}

function accumulateInternal(cell: i32): void {
  let totalCharge: f64 = 0;
  let weight: f64 = 0;
  let weightedX: f64 = 0;
  let weightedY: f64 = 0;
  for (let quadrant = 0; quadrant < 4; quadrant += 1) {
    const nextCell = child(cell, quadrant);
    if (nextCell == EMPTY_INDEX) continue;
    const childWeight = Math.abs(charge(nextCell));
    if (childWeight == 0) continue;
    totalCharge += charge(nextCell);
    weight += childWeight;
    weightedX += childWeight * chargeX(nextCell);
    weightedY += childWeight * chargeY(nextCell);
  }
  setCharge(cell, totalCharge);
  setChargeX(cell, weightedX / weight);
  setChargeY(cell, weightedY / weight);
}

export function applyBarnesHut(
  alpha: f64,
  theta: f64,
  distanceMinimum: f64,
  distanceMaximum: f64,
): void {
  if (root == EMPTY_INDEX) return;
  const thetaSquared = theta * theta;
  const distanceMinimumSquared = distanceMinimum * distanceMinimum;
  const distanceMaximumSquared = distanceMaximum * distanceMaximum;
  for (let target = 0; target < nodeCount; target += 1) {
    if (isHidden(target) || isPinned(target)) continue;
    applyToTarget(
      target,
      alpha,
      thetaSquared,
      distanceMinimumSquared,
      distanceMaximumSquared,
    );
  }
}

function applyToTarget(
  target: i32,
  alpha: f64,
  thetaSquared: f64,
  distanceMinimumSquared: f64,
  distanceMaximumSquared: f64,
): void {
  let stackLength = 1;
  setTraversalCell(0, root);
  setTraversalX(0, minimumX);
  setTraversalY(0, minimumY);
  setTraversalSize(0, rootSize);
  while (stackLength > 0) {
    stackLength -= 1;
    const cell = traversalCell(stackLength);
    const open = applyCell(
      target,
      cell,
      stackLength,
      alpha,
      thetaSquared,
      distanceMinimumSquared,
      distanceMaximumSquared,
    );
    if (open) stackLength = pushChildren(cell, stackLength);
  }
}

function applyCell(
  target: i32,
  cell: i32,
  stackIndex: i32,
  alpha: f64,
  thetaSquared: f64,
  distanceMinimumSquared: f64,
  distanceMaximumSquared: f64,
): bool {
  const cellCharge = charge(cell);
  if (cellCharge == 0) return false;
  forceDx = chargeX(cell) - x(target);
  forceDy = chargeY(cell) - y(target);
  forceDistanceSquared = forceDx * forceDx + forceDy * forceDy;
  const cellSize = traversalSize(stackIndex);
  if (cellSize * cellSize / thetaSquared < forceDistanceSquared) {
    applyAggregate(
      target,
      cellCharge,
      alpha,
      distanceMinimumSquared,
      distanceMaximumSquared,
    );
    return false;
  }
  if (internal(cell)) return true;
  if (forceDistanceSquared >= distanceMaximumSquared) return false;
  applyLeaf(target, cell, alpha, distanceMinimumSquared);
  return false;
}

function applyAggregate(
  target: i32,
  cellCharge: f64,
  alpha: f64,
  distanceMinimumSquared: f64,
  distanceMaximumSquared: f64,
): void {
  if (forceDistanceSquared >= distanceMaximumSquared) return;
  softenCurrentDisplacement(distanceMinimumSquared);
  setVx(target, vx(target) + forceDx * cellCharge * alpha / forceDistanceSquared);
  setVy(target, vy(target) + forceDy * cellCharge * alpha / forceDistanceSquared);
}

function applyLeaf(
  target: i32,
  cell: i32,
  alpha: f64,
  distanceMinimumSquared: f64,
): void {
  const head = leafHead(cell);
  if (head != target || nextCoincident(head) != EMPTY_INDEX) {
    softenCurrentDisplacement(distanceMinimumSquared);
  }
  let source = head;
  while (source != EMPTY_INDEX) {
    if (source != target) {
      const impulse = strength(source) * alpha / forceDistanceSquared;
      setVx(target, vx(target) + forceDx * impulse);
      setVy(target, vy(target) + forceDy * impulse);
    }
    source = nextCoincident(source);
  }
}

function softenCurrentDisplacement(distanceMinimumSquared: f64): void {
  if (forceDx == 0) {
    forceDx = jiggle();
    forceDistanceSquared += forceDx * forceDx;
  }
  if (forceDy == 0) {
    forceDy = jiggle();
    forceDistanceSquared += forceDy * forceDy;
  }
  if (forceDistanceSquared < distanceMinimumSquared) {
    forceDistanceSquared = Math.sqrt(distanceMinimumSquared * forceDistanceSquared);
  }
}

function pushChildren(cell: i32, stackLength: i32): i32 {
  const half = traversalSize(stackLength) / 2;
  const cellX = traversalX(stackLength);
  const cellY = traversalY(stackLength);
  let nextLength = stackLength;
  for (let quadrant = 3; quadrant >= 0; quadrant -= 1) {
    const nextCell = child(cell, quadrant);
    if (nextCell == EMPTY_INDEX) continue;
    setTraversalCell(nextLength, nextCell);
    setTraversalX(nextLength, cellX + <f64>(quadrant & 1) * half);
    setTraversalY(nextLength, cellY + <f64>((quadrant & 2) >> 1) * half);
    setTraversalSize(nextLength, half);
    nextLength += 1;
  }
  return nextLength;
}

@inline
function quadrantAt(
  nodeX: f64,
  nodeY: f64,
  midpointX: f64,
  midpointY: f64,
): i32 {
  return (nodeY >= midpointY ? 2 : 0) + (nodeX >= midpointX ? 1 : 0);
}

function jiggle(): f64 {
  randomState = randomState * 1_664_525 + 1_013_904_223;
  return (<f64>randomState / UINT32_RANGE - 0.5) * 1e-6;
}

export function hasBarnesHutOverflowed(): bool { return overflowed; }
export function getBarnesHutCellCount(): i32 { return cellCount; }
export function getBarnesHutVisibleNodeCount(): i32 { return visibleNodeCount; }
export function getBarnesHutRoot(): i32 { return root; }
export function getBarnesHutMinimumX(): f64 { return minimumX; }
export function getBarnesHutMinimumY(): f64 { return minimumY; }
export function getBarnesHutSize(): f64 { return rootSize; }
export function getBarnesHutRootCharge(): f64 {
  return root == EMPTY_INDEX ? 0 : charge(root);
}
export function getBarnesHutRootChargeX(): f64 {
  return root == EMPTY_INDEX ? NaN : chargeX(root);
}
export function getBarnesHutRootChargeY(): f64 {
  return root == EMPTY_INDEX ? NaN : chargeY(root);
}
export function getBarnesHutRandomState(): u32 { return randomState; }
export function setBarnesHutRandomState(value: u32): void { randomState = value; }
