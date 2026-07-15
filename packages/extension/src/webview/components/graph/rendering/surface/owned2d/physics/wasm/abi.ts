import { requireOwnedGraphPhysicsModule } from './module';

export const OWNED_GRAPH_PHYSICS_ABI_VERSION = 3;
export const OWNED_GRAPH_PHYSICS_MEMORY_BASE = 65_536;
export const MAXIMUM_OWNED_GRAPH_PHYSICS_PAGES = 32_768;

export interface OwnedGraphPhysicsExports {
  memory: WebAssembly.Memory;
  abiVersion(): number;
  graphMemoryBase(): number;
  initializeResult(pointer: number): void;
  initializeGraph(
    nodeCount: number,
    edgeCount: number,
    xPointer: number,
    yPointer: number,
    vxPointer: number,
    vyPointer: number,
    multiplierPointer: number,
    radiusPointer: number,
    flagPointer: number,
    edgeSourcePointer: number,
    edgeTargetPointer: number,
    linkDegreePointer: number,
  ): void;
  initializeRepulsion(
    childrenPointer: number,
    internalPointer: number,
    leafHeadPointer: number,
    nextCoincidentPointer: number,
    strengthPointer: number,
    chargePointer: number,
    chargeXPointer: number,
    chargeYPointer: number,
    buildStackPointer: number,
    buildTraversalPointer: number,
    traversalCellPointer: number,
    traversalXPointer: number,
    traversalYPointer: number,
    traversalSizePointer: number,
    cellCapacity: number,
  ): void;
  initializeCollision(
    nextPointer: number,
    cellXPointer: number,
    cellYPointer: number,
    hashKeyPointer: number,
    hashHeadPointer: number,
    hashUsedPointer: number,
    hashCapacity: number,
  ): void;
  configure(
    centralGravity: number,
    chargeDistanceMaximum: number,
    chargeDistanceMinimum: number,
    chargeStrength: number,
    chargeTheta: number,
    collisionPadding: number,
    collisionScale: number,
    collisionStrength: number,
    initializationSpacing: number,
    linkDistance: number,
    linkStrength: number,
    velocityDecay: number,
    collisionCellSize: number,
  ): void;
  step(alpha: number, collisionIterations: number): number;
  barnesHutOverflowed(): number;
  barnesHutRandomState(): number;
  restoreBarnesHutRandomState(value: number): void;
  rebuildRepulsionDiagnostics(chargeStrength: number): number;
  barnesHutCellCount(): number;
  barnesHutVisibleNodeCount(): number;
  barnesHutRoot(): number;
  barnesHutMinimumX(): number;
  barnesHutMinimumY(): number;
  barnesHutSize(): number;
  barnesHutRootCharge(): number;
  barnesHutRootChargeX(): number;
  barnesHutRootChargeY(): number;
}

export function assertOwnedGraphPhysicsAbi(
  exports: OwnedGraphPhysicsExports,
  memory: WebAssembly.Memory,
): void {
  if (exports.abiVersion() !== OWNED_GRAPH_PHYSICS_ABI_VERSION) {
    throw new Error('Owned graph WASM physics ABI version mismatch');
  }
  if (exports.graphMemoryBase() !== OWNED_GRAPH_PHYSICS_MEMORY_BASE) {
    throw new Error('Owned graph WASM physics memory layout mismatch');
  }
  if (exports.memory !== memory) {
    throw new Error('Owned graph WASM physics did not export its imported memory');
  }
}

export function instantiateOwnedGraphPhysics(
  memory: WebAssembly.Memory,
): OwnedGraphPhysicsExports {
  const instance = new WebAssembly.Instance(
    requireOwnedGraphPhysicsModule(),
    { env: { memory } },
  );
  const exports = instance.exports as unknown as OwnedGraphPhysicsExports;
  assertOwnedGraphPhysicsAbi(exports, memory);
  return exports;
}
