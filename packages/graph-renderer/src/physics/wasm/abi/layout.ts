import { GRAPH_GRAPH_PHYSICS_MEMORY_BASE } from './contracts';

export const WASM_PAGE_BYTES = 65_536;

export interface MemoryRegion {
  offset: number;
  bytes: number;
}

export interface GraphPhysicsMemoryLayout {
  totalBytes: number;
  cellCapacity: number;
  hashCapacity: number;
  x: MemoryRegion;
  y: MemoryRegion;
  vx: MemoryRegion;
  vy: MemoryRegion;
  multipliers: MemoryRegion;
  radii: MemoryRegion;
  flags: MemoryRegion;
  edgeSources: MemoryRegion;
  edgeTargets: MemoryRegion;
  linkDegrees: MemoryRegion;
  result: MemoryRegion;
  barnesHutChildren: MemoryRegion;
  barnesHutInternal: MemoryRegion;
  barnesHutLeafHeads: MemoryRegion;
  barnesHutNextCoincident: MemoryRegion;
  barnesHutStrengths: MemoryRegion;
  barnesHutCharges: MemoryRegion;
  barnesHutChargeX: MemoryRegion;
  barnesHutChargeY: MemoryRegion;
  barnesHutBuildStack: MemoryRegion;
  barnesHutBuildTraversal: MemoryRegion;
  barnesHutTraversalCells: MemoryRegion;
  barnesHutTraversalX: MemoryRegion;
  barnesHutTraversalY: MemoryRegion;
  barnesHutTraversalSize: MemoryRegion;
  collisionNext: MemoryRegion;
  collisionCellX: MemoryRegion;
  collisionCellY: MemoryRegion;
  collisionHashKeys: MemoryRegion;
  collisionHashHeads: MemoryRegion;
  collisionHashUsed: MemoryRegion;
}

function align(value: number, alignment: number): number {
  return Math.ceil(value / alignment) * alignment;
}

function nextPowerOfTwo(value: number): number {
  let result = 1;
  while (result < value) result *= 2;
  return result;
}

export function createGraphPhysicsMemoryLayout(
  nodeCount: number,
  edgeCount: number,
  cellCapacity: number,
): GraphPhysicsMemoryLayout {
  let offset = GRAPH_GRAPH_PHYSICS_MEMORY_BASE;
  const reserve = (length: number, bytesPerElement: number): MemoryRegion => {
    offset = align(offset, Math.min(bytesPerElement, 8));
    const region = { offset, bytes: length * bytesPerElement };
    offset += region.bytes;
    return region;
  };
  const hashCapacity = nextPowerOfTwo(Math.max(16, nodeCount * 2));
  const layout = {
    cellCapacity,
    hashCapacity,
    x: reserve(nodeCount, 4),
    y: reserve(nodeCount, 4),
    vx: reserve(nodeCount, 4),
    vy: reserve(nodeCount, 4),
    multipliers: reserve(nodeCount, 4),
    radii: reserve(nodeCount, 4),
    flags: reserve(nodeCount, 1),
    edgeSources: reserve(edgeCount, 4),
    edgeTargets: reserve(edgeCount, 4),
    linkDegrees: reserve(nodeCount, 4),
    result: reserve(1, 4),
    barnesHutChildren: reserve(cellCapacity * 4, 4),
    barnesHutInternal: reserve(cellCapacity, 1),
    barnesHutLeafHeads: reserve(cellCapacity, 4),
    barnesHutNextCoincident: reserve(nodeCount, 4),
    barnesHutStrengths: reserve(nodeCount, 8),
    barnesHutCharges: reserve(cellCapacity, 8),
    barnesHutChargeX: reserve(cellCapacity, 8),
    barnesHutChargeY: reserve(cellCapacity, 8),
    barnesHutBuildStack: reserve(cellCapacity, 4),
    barnesHutBuildTraversal: reserve(cellCapacity, 4),
    barnesHutTraversalCells: reserve(cellCapacity, 4),
    barnesHutTraversalX: reserve(cellCapacity, 8),
    barnesHutTraversalY: reserve(cellCapacity, 8),
    barnesHutTraversalSize: reserve(cellCapacity, 8),
    collisionNext: reserve(nodeCount, 4),
    collisionCellX: reserve(nodeCount, 4),
    collisionCellY: reserve(nodeCount, 4),
    collisionHashKeys: reserve(hashCapacity, 4),
    collisionHashHeads: reserve(hashCapacity, 4),
    collisionHashUsed: reserve(hashCapacity, 1),
    totalBytes: 0,
  };
  layout.totalBytes = align(offset, WASM_PAGE_BYTES);
  return layout;
}
