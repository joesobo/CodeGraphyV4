import { applyBarnesHutForces } from './barnesHut/apply';
import { rebuildBarnesHutTree } from './barnesHut/build';
import { initializeBuildBuffers } from './barnesHut/buildBuffers';
import { charge, chargeX, chargeY, initializeCharges } from './barnesHut/charge';
import { initializeCells } from './barnesHut/cells';
import { minimumX, minimumY, rootSize } from './barnesHut/extent';
import { randomState, setRandomState } from './barnesHut/random';
import { initializeTraversal } from './barnesHut/traversal';
import {
  cellCount,
  EMPTY_INDEX,
  initializeTreeState,
  overflowed,
  root,
  visibleNodeCount,
} from './barnesHut/treeState';

export function initializeBarnesHut(
  childrenPointer: usize,
  internalPointer: usize,
  leafHeadPointer: usize,
  coincidentNodePointer: usize,
  strengthPointer: usize,
  chargePointer: usize,
  chargeXPointer: usize,
  chargeYPointer: usize,
  buildStackPointer: usize,
  buildTraversalPointer: usize,
  traversalCellPointer: usize,
  traversalXPointer: usize,
  traversalYPointer: usize,
  traversalSizePointer: usize,
  capacity: i32,
): void {
  initializeCells(childrenPointer, internalPointer, leafHeadPointer, coincidentNodePointer);
  initializeCharges(strengthPointer, chargePointer, chargeXPointer, chargeYPointer);
  initializeBuildBuffers(buildStackPointer, buildTraversalPointer);
  initializeTraversal(
    traversalCellPointer,
    traversalXPointer,
    traversalYPointer,
    traversalSizePointer,
  );
  initializeTreeState(capacity);
}

export function rebuildBarnesHut(globalChargeStrength: f64): bool {
  return rebuildBarnesHutTree(globalChargeStrength);
}

export function applyBarnesHut(
  alpha: f64,
  theta: f64,
  distanceMinimum: f64,
  distanceMaximum: f64,
): void {
  applyBarnesHutForces(alpha, theta, distanceMinimum, distanceMaximum);
}

export function hasBarnesHutOverflowed(): bool { return overflowed(); }
export function getBarnesHutCellCount(): i32 { return cellCount(); }
export function getBarnesHutVisibleNodeCount(): i32 { return visibleNodeCount(); }
export function getBarnesHutRoot(): i32 { return root(); }
export function getBarnesHutMinimumX(): f64 { return minimumX(); }
export function getBarnesHutMinimumY(): f64 { return minimumY(); }
export function getBarnesHutSize(): f64 { return rootSize(); }
export function getBarnesHutRootCharge(): f64 {
  return root() == EMPTY_INDEX ? 0 : charge(root());
}
export function getBarnesHutRootChargeX(): f64 {
  return root() == EMPTY_INDEX ? NaN : chargeX(root());
}
export function getBarnesHutRootChargeY(): f64 {
  return root() == EMPTY_INDEX ? NaN : chargeY(root());
}
export function getBarnesHutRandomState(): u32 { return randomState(); }
export function setBarnesHutRandomState(value: u32): void { setRandomState(value); }
