import type { GraphLayoutConfig, GraphLayoutState } from '../contracts';
import {
  instantiateGraphPhysics,
  type GraphPhysicsExports,
} from './abi';
import { assertGraphCollisionConfiguration } from './configuration';
import { GraphPhysicsStorage } from './storage';

const INITIAL_BARNES_HUT_CELLS_PER_NODE = 8;

export interface GraphBarnesHutDiagnostics {
  cellCount: number;
  rootBounds: { minimumX: number; minimumY: number; size: number } | undefined;
  rootCharge: number;
  rootChargeX: number;
  rootChargeY: number;
  visibleNodeCount: number;
}

export class GraphWasmPhysicsKernel {
  private storage!: GraphPhysicsStorage;
  private exports!: GraphPhysicsExports;
  private currentConfig!: GraphLayoutConfig;
  private currentCollisionScale = 1;
  private currentCollisionCellSize = 1;
  private correctionCount = 0;

  constructor(
    state: GraphLayoutState,
    config: GraphLayoutConfig,
    collisionScale: number,
    collisionCellSize: number,
    randomState = 1,
  ) {
    const cellCapacity = Math.max(
      256,
      state.x.length * INITIAL_BARNES_HUT_CELLS_PER_NODE + 64,
    );
    this.initialize(
      state,
      config,
      collisionScale,
      collisionCellSize,
      cellCapacity,
      randomState,
    );
  }

  get state(): GraphLayoutState { return this.storage.state; }
  get collisionCorrectionCount(): number { return this.correctionCount; }
  get memoryBytes(): number { return this.storage.memory.buffer.byteLength; }
  get randomState(): number { return this.exports.barnesHutRandomState(); }

  configure(
    config: GraphLayoutConfig,
    collisionScale: number,
    collisionCellSize: number,
  ): void {
    assertGraphCollisionConfiguration(collisionScale, collisionCellSize);
    this.currentConfig = config;
    this.currentCollisionScale = collisionScale;
    this.currentCollisionCellSize = collisionCellSize;
    this.exports.configure(
      config.centralGravity,
      config.chargeDistanceMax,
      config.chargeDistanceMin,
      config.chargeStrength,
      config.chargeTheta,
      config.collisionPadding,
      collisionScale,
      config.collisionStrength,
      config.initializationSpacing,
      config.linkDistance,
      config.linkStrength,
      config.velocityDecay,
      collisionCellSize,
    );
  }

  step(alpha: number, collisionIterations: number): number {
    for (;;) {
      const maximumVelocity = this.exports.step(alpha, collisionIterations);
      if (Number.isFinite(maximumVelocity)) {
        this.correctionCount = this.storage.result[0];
        return maximumVelocity;
      }
      if (!this.exports.barnesHutOverflowed()) {
        throw new Error('Graph WASM physics returned a non-finite velocity');
      }
      this.growBarnesHutCapacity();
    }
  }

  rebuildBarnesHutDiagnostics(chargeStrength: number): GraphBarnesHutDiagnostics {
    if (!this.exports.rebuildRepulsionDiagnostics(chargeStrength)) {
      this.growBarnesHutCapacity();
      return this.rebuildBarnesHutDiagnostics(chargeStrength);
    }
    const root = this.exports.barnesHutRoot();
    return {
      cellCount: this.exports.barnesHutCellCount(),
      rootBounds: root < 0
        ? undefined
        : {
            minimumX: this.exports.barnesHutMinimumX(),
            minimumY: this.exports.barnesHutMinimumY(),
            size: this.exports.barnesHutSize(),
          },
      rootCharge: this.exports.barnesHutRootCharge(),
      rootChargeX: this.exports.barnesHutRootChargeX(),
      rootChargeY: this.exports.barnesHutRootChargeY(),
      visibleNodeCount: this.exports.barnesHutVisibleNodeCount(),
    };
  }

  private initialize(
    source: GraphLayoutState,
    config: GraphLayoutConfig,
    collisionScale: number,
    collisionCellSize: number,
    cellCapacity: number,
    randomState: number,
  ): void {
    this.storage = new GraphPhysicsStorage(source, cellCapacity);
    this.exports = instantiateGraphPhysics(this.storage.memory);
    this.storage.initialize(this.exports);
    this.exports.restoreBarnesHutRandomState(randomState);
    this.configure(config, collisionScale, collisionCellSize);
  }

  private growBarnesHutCapacity(): void {
    const source = this.storage.state;
    const randomState = this.exports.barnesHutRandomState();
    this.initialize(
      source,
      this.currentConfig,
      this.currentCollisionScale,
      this.currentCollisionCellSize,
      this.storage.layout.cellCapacity * 2,
      randomState,
    );
  }
}
