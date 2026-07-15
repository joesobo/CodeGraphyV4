export enum GraphNodeFlag {
  Pinned = 1 << 0,
  Hidden = 1 << 1,
}

export interface GraphLayoutInput {
  nodeIds: readonly string[];
  initialX?: Float32Array;
  initialY?: Float32Array;
  initialVx?: Float32Array;
  initialVy?: Float32Array;
  chargeStrengthMultipliers?: Float32Array;
  radii: Float32Array;
  edgeSources: Uint32Array;
  edgeTargets: Uint32Array;
  flags?: Uint8Array;
}

export interface GraphLayoutConfig {
  alphaDecay: number;
  alphaMinimum: number;
  centralGravity: number;
  chargeDistanceMax: number;
  chargeDistanceMin: number;
  chargeStrength: number;
  chargeTheta: number;
  collisionIterations: number;
  collisionPadding: number;
  collisionStrength: number;
  initializationSpacing: number;
  linkDistance: number;
  linkStrength: number;
  settleSpeed: number;
  settleSteps: number;
  velocityDecay: number;
}

export interface GraphLayoutTickResult {
  moving: boolean;
  settled: boolean;
  steps: number;
}

export interface GraphLayoutEngine {
  readonly nodeIds: readonly string[];
  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly vx: Float32Array;
  readonly vy: Float32Array;
  readonly chargeStrengthMultipliers: Float32Array;
  readonly radii: Float32Array;
  readonly flags: Uint8Array;
  readonly edgeSources: Uint32Array;
  readonly edgeTargets: Uint32Array;
  readonly settled: boolean;
  readonly alpha: number;
  getNodeIndex(nodeId: string): number | undefined;
  setGraph(input: GraphLayoutInput): void;
  setConfig(config: Partial<GraphLayoutConfig>): void;
  setCollisionScale(scale: number): void;
  setKinematics(x: Float32Array, y: Float32Array, vx: Float32Array, vy: Float32Array): void;
  tick(): GraphLayoutTickResult;
  setNodePosition(index: number, x: number, y: number): void;
  pin(index: number): void;
  release(index: number): void;
  setAlphaTarget(alpha: number): void;
  reheat(alpha?: number): void;
  pause(): void;
  resume(): void;
}

export interface GraphLayoutState {
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  chargeStrengthMultipliers: Float32Array;
  radii: Float32Array;
  flags: Uint8Array;
  edgeSources: Uint32Array;
  edgeTargets: Uint32Array;
  linkDegrees: Uint32Array;
}
