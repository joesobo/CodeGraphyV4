import type { GraphLayoutConfig, GraphLayoutState } from '../contracts';
import {
  instantiateOwnedGraphPhysics,
  type OwnedGraphPhysicsExports,
} from './abi';
import { assertOwnedGraphCollisionConfiguration } from './configuration';
import { OwnedGraphPhysicsStorage } from './storage';

const INITIAL_BARNES_HUT_CELLS_PER_NODE = 8;

export interface OwnedGraphBarnesHutDiagnostics {
  cellCount: number;
  rootBounds: { minimumX: number; minimumY: number; size: number } | undefined;
  rootCharge: number;
  rootChargeX: number;
  rootChargeY: number;
  visibleNodeCount: number;
}

export class OwnedGraphWasmPhysicsKernel {
  private storage!: OwnedGraphPhysicsStorage;
  private exports!: OwnedGraphPhysicsExports;
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
    assertOwnedGraphCollisionConfiguration(collisionScale, collisionCellSize);
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
      config.maximumCollisionNeighbors,
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
        throw new Error('Owned graph WASM physics returned a non-finite velocity');
      }
      this.growBarnesHutCapacity();
    }
  }

  rebuildBarnesHutDiagnostics(chargeStrength: number): OwnedGraphBarnesHutDiagnostics {
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
    this.storage = new OwnedGraphPhysicsStorage(source, cellCapacity);
    this.exports = instantiateOwnedGraphPhysics(this.storage.memory);
    this.storage.initialize(this.exports);
    this.exports.restoreBarnesHutRandomState(randomState);
    this.configure(config, collisionScale, collisionCellSize);
  }

  private growBarnesHutCapacity(): void {
    const source = this.storage.snapshot();
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
