import { configurePhysics } from './parameters';
import { applyCenterForces } from './forces/center';
import { applyCollisionForces } from './forces/collision/force';
import {
  getBarnesHutCellCount,
  getBarnesHutMinimumX,
  getBarnesHutMinimumY,
  getBarnesHutRandomState,
  getBarnesHutRoot,
  getBarnesHutRootCharge,
  getBarnesHutRootChargeX,
  getBarnesHutRootChargeY,
  getBarnesHutSize,
  getBarnesHutVisibleNodeCount,
  hasBarnesHutOverflowed,
  initializeBarnesHut,
  rebuildBarnesHut,
  setBarnesHutRandomState,
} from './forces/barnesHut';
import { applyLinkForces } from './forces/link/force';
import {
  applyRepulsion,
  rebuildRepulsion,
  repulsionEnabled,
} from './forces/repulsion';
import { integrateGraphLayout } from './integration';
import { initializeGraphMemory } from './memory';
import { initializeSpatialGrid } from './spatial/grid';

const ABI_VERSION: i32 = 4;
const GRAPH_MEMORY_BASE: i32 = 65_536;

let resultPointer: usize = 0;

export function abiVersion(): i32 { return ABI_VERSION; }
export function graphMemoryBase(): i32 { return GRAPH_MEMORY_BASE; }

export function initializeResult(pointer: usize): void {
  resultPointer = pointer;
}

export function initializeGraph(
  nodeCount: i32,
  edgeCount: i32,
  xPointer: usize,
  yPointer: usize,
  vxPointer: usize,
  vyPointer: usize,
  multiplierPointer: usize,
  radiusPointer: usize,
  flagPointer: usize,
  edgeSourcePointer: usize,
  edgeTargetPointer: usize,
  linkDegreePointer: usize,
): void {
  initializeGraphMemory(
    nodeCount,
    edgeCount,
    xPointer,
    yPointer,
    vxPointer,
    vyPointer,
    multiplierPointer,
    radiusPointer,
    flagPointer,
    edgeSourcePointer,
    edgeTargetPointer,
    linkDegreePointer,
  );
}

export function initializeRepulsion(
  childrenPointer: usize,
  internalPointer: usize,
  leafHeadPointer: usize,
  nextCoincidentPointer: usize,
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
  cellCapacity: i32,
): void {
  initializeBarnesHut(
    childrenPointer,
    internalPointer,
    leafHeadPointer,
    nextCoincidentPointer,
    strengthPointer,
    chargePointer,
    chargeXPointer,
    chargeYPointer,
    buildStackPointer,
    buildTraversalPointer,
    traversalCellPointer,
    traversalXPointer,
    traversalYPointer,
    traversalSizePointer,
    cellCapacity,
  );
}

export function initializeCollision(
  nextPointer: usize,
  cellXPointer: usize,
  cellYPointer: usize,
  hashKeyPointer: usize,
  hashHeadPointer: usize,
  hashUsedPointer: usize,
  hashCapacity: i32,
): void {
  initializeSpatialGrid(
    nextPointer,
    cellXPointer,
    cellYPointer,
    hashKeyPointer,
    hashHeadPointer,
    hashUsedPointer,
    hashCapacity,
  );
}

export function configure(
  centralGravity: f64,
  chargeDistanceMaximum: f64,
  chargeDistanceMinimum: f64,
  chargeStrength: f64,
  chargeTheta: f64,
  collisionPadding: f64,
  collisionScale: f64,
  collisionStrength: f64,
  initializationSpacing: f64,
  linkDistance: f64,
  linkStrength: f64,
  velocityDecay: f64,
  collisionCellSize: f64,
): void {
  configurePhysics(
    centralGravity,
    chargeDistanceMaximum,
    chargeDistanceMinimum,
    chargeStrength,
    chargeTheta,
    collisionPadding,
    collisionScale,
    collisionStrength,
    initializationSpacing,
    linkDistance,
    linkStrength,
    velocityDecay,
    collisionCellSize,
  );
}

export function applyForces(alpha: f64): bool {
  const hasRepulsion = repulsionEnabled(alpha);
  if (hasRepulsion && !rebuildRepulsion()) return false;
  applyLinkForces(alpha);
  if (hasRepulsion) applyRepulsion(alpha);
  applyCenterForces(alpha);
  return true;
}

export function integrate(collisionIterations: f64): f64 {
  const maximumVelocity = integrateGraphLayout();
  store<i32>(resultPointer, applyCollisionForces(collisionIterations));
  return maximumVelocity;
}

export function rebuildRepulsionDiagnostics(chargeStrength: f64): bool {
  return rebuildBarnesHut(chargeStrength);
}

export function barnesHutOverflowed(): bool { return hasBarnesHutOverflowed(); }
export function barnesHutCellCount(): i32 { return getBarnesHutCellCount(); }
export function barnesHutVisibleNodeCount(): i32 { return getBarnesHutVisibleNodeCount(); }
export function barnesHutRoot(): i32 { return getBarnesHutRoot(); }
export function barnesHutMinimumX(): f64 { return getBarnesHutMinimumX(); }
export function barnesHutMinimumY(): f64 { return getBarnesHutMinimumY(); }
export function barnesHutSize(): f64 { return getBarnesHutSize(); }
export function barnesHutRootCharge(): f64 { return getBarnesHutRootCharge(); }
export function barnesHutRootChargeX(): f64 { return getBarnesHutRootChargeX(); }
export function barnesHutRootChargeY(): f64 { return getBarnesHutRootChargeY(); }
export function barnesHutRandomState(): u32 { return getBarnesHutRandomState(); }
export function restoreBarnesHutRandomState(value: u32): void {
  setBarnesHutRandomState(value);
}
