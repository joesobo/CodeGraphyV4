import type { GraphLayoutConfig, GraphLayoutState } from '../contracts';
import type { GraphWasmPhysicsKernel } from '../wasm/runtime/kernel';

export interface GraphEngineState {
  alpha: number;
  alphaTarget: number;
  collisionScale: number;
  config: GraphLayoutConfig;
  graph: GraphLayoutState;
  kernel: GraphWasmPhysicsKernel;
  maximumCollisionRadius: number;
  nodeIds: readonly string[];
  nodeIndexes: Map<string, number>;
  paused: boolean;
  settled: boolean;
  settledStepCount: number;
}
