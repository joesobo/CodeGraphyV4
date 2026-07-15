import type { GraphLayoutState } from '../contracts';
import {
  MAXIMUM_GRAPH_GRAPH_PHYSICS_PAGES,
  type GraphPhysicsExports,
} from './abi';
import {
  createGraphPhysicsMemoryLayout,
  type MemoryRegion,
  type GraphPhysicsMemoryLayout,
  WASM_PAGE_BYTES,
} from './layout';

function f32(memory: WebAssembly.Memory, region: MemoryRegion): Float32Array {
  return new Float32Array(memory.buffer, region.offset, region.bytes / 4);
}

function u32(memory: WebAssembly.Memory, region: MemoryRegion): Uint32Array {
  return new Uint32Array(memory.buffer, region.offset, region.bytes / 4);
}

export class GraphPhysicsStorage {
  readonly memory: WebAssembly.Memory;
  readonly layout: GraphPhysicsMemoryLayout;
  readonly state: GraphLayoutState;
  readonly result: Int32Array;

  constructor(source: GraphLayoutState, cellCapacity: number) {
    this.layout = createGraphPhysicsMemoryLayout(
      source.x.length,
      source.edgeSources.length,
      cellCapacity,
    );
    this.memory = new WebAssembly.Memory({
      initial: this.layout.totalBytes / WASM_PAGE_BYTES,
      maximum: MAXIMUM_GRAPH_GRAPH_PHYSICS_PAGES,
    });
    this.state = {
      x: f32(this.memory, this.layout.x),
      y: f32(this.memory, this.layout.y),
      vx: f32(this.memory, this.layout.vx),
      vy: f32(this.memory, this.layout.vy),
      chargeStrengthMultipliers: f32(this.memory, this.layout.multipliers),
      radii: f32(this.memory, this.layout.radii),
      flags: new Uint8Array(
        this.memory.buffer,
        this.layout.flags.offset,
        this.layout.flags.bytes,
      ),
      edgeSources: u32(this.memory, this.layout.edgeSources),
      edgeTargets: u32(this.memory, this.layout.edgeTargets),
      linkDegrees: u32(this.memory, this.layout.linkDegrees),
    };
    this.copyState(source);
    this.result = new Int32Array(this.memory.buffer, this.layout.result.offset, 1);
  }

  initialize(exports: GraphPhysicsExports): void {
    const layout = this.layout;
    exports.initializeResult(layout.result.offset);
    exports.initializeGraph(
      this.state.x.length,
      this.state.edgeSources.length,
      layout.x.offset,
      layout.y.offset,
      layout.vx.offset,
      layout.vy.offset,
      layout.multipliers.offset,
      layout.radii.offset,
      layout.flags.offset,
      layout.edgeSources.offset,
      layout.edgeTargets.offset,
      layout.linkDegrees.offset,
    );
    exports.initializeRepulsion(
      layout.barnesHutChildren.offset,
      layout.barnesHutInternal.offset,
      layout.barnesHutLeafHeads.offset,
      layout.barnesHutNextCoincident.offset,
      layout.barnesHutStrengths.offset,
      layout.barnesHutCharges.offset,
      layout.barnesHutChargeX.offset,
      layout.barnesHutChargeY.offset,
      layout.barnesHutBuildStack.offset,
      layout.barnesHutBuildTraversal.offset,
      layout.barnesHutTraversalCells.offset,
      layout.barnesHutTraversalX.offset,
      layout.barnesHutTraversalY.offset,
      layout.barnesHutTraversalSize.offset,
      layout.cellCapacity,
    );
    exports.initializeCollision(
      layout.collisionNext.offset,
      layout.collisionCellX.offset,
      layout.collisionCellY.offset,
      layout.collisionHashKeys.offset,
      layout.collisionHashHeads.offset,
      layout.collisionHashUsed.offset,
      layout.hashCapacity,
    );
  }

  private copyState(source: GraphLayoutState): void {
    this.state.x.set(source.x);
    this.state.y.set(source.y);
    this.state.vx.set(source.vx);
    this.state.vy.set(source.vy);
    this.state.chargeStrengthMultipliers.set(source.chargeStrengthMultipliers);
    this.state.radii.set(source.radii);
    this.state.flags.set(source.flags);
    this.state.edgeSources.set(source.edgeSources);
    this.state.edgeTargets.set(source.edgeTargets);
    this.state.linkDegrees.set(source.linkDegrees);
  }
}
