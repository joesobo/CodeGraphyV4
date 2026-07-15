import { collisionCellSize } from './config';
import { isHidden, nodeCount, x, y } from './memory';
import {
  clearSpatialHash,
  initializeSpatialHash,
  prependSpatialHashHead,
  spatialHashHead,
  spatialKey,
} from './spatialHash';

let nextPointer: usize = 0;
let cellXPointer: usize = 0;
let cellYPointer: usize = 0;

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
  initializeSpatialHash(
    nextHashKeyPointer,
    nextHashHeadPointer,
    nextHashUsedPointer,
    nextHashCapacity,
  );
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

export function rebuildSpatialGrid(): void {
  clearSpatialHash();
  for (let index = 0; index < nodeCount; index += 1) {
    if (isHidden(index)) continue;
    const currentCellX = <i32>Math.floor(x(index) / collisionCellSize);
    const currentCellY = <i32>Math.floor(y(index) / collisionCellSize);
    setCellX(index, currentCellX);
    setCellY(index, currentCellY);
    const hashKey = spatialKey(currentCellX, currentCellY);
    setNext(index, prependSpatialHashHead(hashKey, index));
  }
}

export function firstInCell(targetX: i32, targetY: i32): i32 {
  return spatialHashHead(spatialKey(targetX, targetY));
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
