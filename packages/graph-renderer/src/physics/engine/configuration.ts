import { mergeGraphLayoutConfig } from '../config/model';
import type { GraphLayoutConfig } from '../contracts';
import { collisionCellSize } from '../graph/storage';
import { assertGraphCollisionScale } from '../wasm/abi/configuration';
import type { GraphEngineState } from './state';

function configureKernel(
  state: GraphEngineState,
  config: GraphLayoutConfig,
  collisionScale: number,
): void {
  state.kernel.configure(
    config,
    collisionScale,
    collisionCellSize(config, state.maximumCollisionRadius, collisionScale),
  );
}

export function updateEngineConfig(
  state: GraphEngineState,
  config: Partial<GraphLayoutConfig>,
): boolean {
  const nextConfig = mergeGraphLayoutConfig(state.config, config);
  configureKernel(state, nextConfig, state.collisionScale);
  state.config = nextConfig;
  return state.graph.x.length > 0;
}

export function updateCollisionScale(state: GraphEngineState, scale: number): void {
  if (scale === state.collisionScale) return;
  assertGraphCollisionScale(scale);
  const expandsEnvelope = scale > state.collisionScale;
  configureKernel(state, state.config, scale);
  state.collisionScale = scale;
  if (expandsEnvelope && state.graph.x.length > 0) {
    state.settled = false;
    state.settledStepCount = 0;
  }
}
