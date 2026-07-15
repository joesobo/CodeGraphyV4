import { collisionCellSize } from './config';
import { HIDDEN_FLAG, flags, nodeCount, x, y } from './memory';

let nextPointer: usize = 0;
let cellXPointer: usize = 0;
let cellYPointer: usize = 0;
let hashKeyPointer: usize = 0;
let hashHeadPointer: usize = 0;
let hashUsedPointer: usize = 0;
let hashCapacity: i32 = 0;
let hashMask: i32 = 0;

export function initializeSpatialGrid(
  nextNodesPointer: usize,
  nextCellXPointer: usize,
  nextCellYPointer: usize,
  nextHashKeyPointer: usize,
  nextHashHeadPointer: usize,
  nextHashUsedPointer: usize,
  nextHashCapacity: i32,
): void {
  nextPointer = nextNodesPointer;
  cellXPointer = nextCellXPointer;
  cellYPointer = nextCellYPointer;
  hashKeyPointer = nextHashKeyPointer;
  hashHeadPointer = nextHashHeadPointer;
  hashUsedPointer = nextHashUsedPointer;
  hashCapacity = nextHashCapacity;
  hashMask = nextHashCapacity - 1;
}

@inline
function next(index: i32): i32 {
  return load<i32>(nextPointer + (<usize>index << 2));
}

@inline
function setNext(index: i32, value: i32): void {
  store<i32>(nextPointer + (<usize>index << 2), value);
}

@inline
function cellX(index: i32): i32 {
  return load<i32>(cellXPointer + (<usize>index << 2));
}

@inline
function cellY(index: i32): i32 {
  return load<i32>(cellYPointer + (<usize>index << 2));
}

@inline
function setCellX(index: i32, value: i32): void {
  store<i32>(cellXPointer + (<usize>index << 2), value);
}

@inline
function setCellY(index: i32, value: i32): void {
  store<i32>(cellYPointer + (<usize>index << 2), value);
}

@inline
function key(cellXValue: i32, cellYValue: i32): i32 {
  return (cellXValue * 73_856_093) ^ (cellYValue * 19_349_663);
}

function findHashSlot(hashKey: i32): i32 {
  let slot = <i32>(<u32>hashKey & <u32>hashMask);
  while (load<u8>(hashUsedPointer + <usize>slot) != 0) {
    if (load<i32>(hashKeyPointer + (<usize>slot << 2)) == hashKey) return slot;
    slot = (slot + 1) & hashMask;
  }
  return slot;
}

@inline
function hashHead(hashKey: i32): i32 {
  const slot = findHashSlot(hashKey);
  return load<u8>(hashUsedPointer + <usize>slot) == 0
    ? -1
    : load<i32>(hashHeadPointer + (<usize>slot << 2));
}

function prependHashHead(hashKey: i32, head: i32): i32 {
  const slot = findHashSlot(hashKey);
  const previousHead = load<u8>(hashUsedPointer + <usize>slot) == 0
    ? -1
    : load<i32>(hashHeadPointer + (<usize>slot << 2));
  store<u8>(hashUsedPointer + <usize>slot, 1);
  store<i32>(hashKeyPointer + (<usize>slot << 2), hashKey);
  store<i32>(hashHeadPointer + (<usize>slot << 2), head);
  return previousHead;
}

export function rebuildSpatialGrid(): void {
  memory.fill(hashUsedPointer, 0, <usize>hashCapacity);
  for (let index = 0; index < nodeCount; index += 1) {
    if ((flags(index) & HIDDEN_FLAG) != 0) continue;
    const currentCellX = <i32>Math.floor(x(index) / collisionCellSize);
    const currentCellY = <i32>Math.floor(y(index) / collisionCellSize);
    setCellX(index, currentCellX);
    setCellY(index, currentCellY);
    const hashKey = key(currentCellX, currentCellY);
    setNext(index, prependHashHead(hashKey, index));
  }
}

export function firstInCell(targetX: i32, targetY: i32): i32 {
  return hashHead(key(targetX, targetY));
}

export function nextInCell(index: i32): i32 {
  return next(index);
}

export function nodeCellX(index: i32): i32 {
  return cellX(index);
}

export function nodeCellY(index: i32): i32 {
  return cellY(index);
}
