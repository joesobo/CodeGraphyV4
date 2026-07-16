import { requireGraphPhysicsModule } from '../runtime/module';

export const GRAPH_GRAPH_PHYSICS_ABI_VERSION = 5;
export const GRAPH_GRAPH_PHYSICS_MEMORY_BASE = 65_536;
export const MAXIMUM_GRAPH_GRAPH_PHYSICS_PAGES = 32_768;

export interface GraphPhysicsExports {
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
    collisionStrength: number,
    initializationSpacing: number,
    linkDistance: number,
    linkStrength: number,
    velocityDecay: number,
    collisionCellSize: number,
  ): void;
  applyForces(alpha: number): number;
  integrate(collisionIterations: number): number;
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

export function assertGraphPhysicsAbi(
  exports: GraphPhysicsExports,
  memory: WebAssembly.Memory,
): void {
  if (exports.abiVersion() !== GRAPH_GRAPH_PHYSICS_ABI_VERSION) {
    throw new Error('Graph WASM physics ABI version mismatch');
  }
  if (exports.graphMemoryBase() !== GRAPH_GRAPH_PHYSICS_MEMORY_BASE) {
    throw new Error('Graph WASM physics memory layout mismatch');
  }
  if (exports.memory !== memory) {
    throw new Error('Graph WASM physics did not export its imported memory');
  }
}

export function instantiateGraphPhysics(
  memory: WebAssembly.Memory,
): GraphPhysicsExports {
  const instance = new WebAssembly.Instance(
    requireGraphPhysicsModule(),
    { env: { memory } },
  );
  const exports = instance.exports as unknown as GraphPhysicsExports;
  assertGraphPhysicsAbi(exports, memory);
  return exports;
}
