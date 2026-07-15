import { mergeGraphLayoutConfig } from '../config/model';
import type { GraphLayoutConfig } from '../contracts';
import { collisionCellSize } from '../graph/storage';
import { assertGraphCollisionScale } from '../wasm/abi/configuration';
import type { GraphEngineState } from './state';

function configureKernel(state: GraphEngineState): void {
  state.kernel.configure(
    state.config,
    state.collisionScale,
    collisionCellSize(state.config, state.maximumCollisionRadius, state.collisionScale),
  );
}

export function updateEngineConfig(
  state: GraphEngineState,
  config: Partial<GraphLayoutConfig>,
): boolean {
  state.config = mergeGraphLayoutConfig(state.config, config);
  configureKernel(state);
  return state.graph.x.length > 0;
}

export function updateCollisionScale(state: GraphEngineState, scale: number): void {
  if (scale === state.collisionScale) return;
  assertGraphCollisionScale(scale);
  const expandsEnvelope = scale > state.collisionScale;
  state.collisionScale = scale;
  configureKernel(state);
  if (expandsEnvelope && state.graph.x.length > 0) {
    state.settled = false;
    state.settledStepCount = 0;
  }
}
