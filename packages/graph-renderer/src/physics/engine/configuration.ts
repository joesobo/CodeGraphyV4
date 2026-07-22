import { mergeGraphLayoutConfig } from '../config/model';
import type { GraphLayoutConfig } from '../contracts';
import { collisionCellSize } from '../graph/storage';
import type { GraphEngineState } from './state';

function configureKernel(
  state: GraphEngineState,
  config: GraphLayoutConfig,
): void {
  state.kernel.configure(
    config,
    collisionCellSize(config, state.maximumCollisionRadius),
  );
}

export function updateEngineConfig(
  state: GraphEngineState,
  config: Partial<GraphLayoutConfig>,
): boolean {
  const nextConfig = mergeGraphLayoutConfig(state.config, config);
  configureKernel(state, nextConfig);
  state.config = nextConfig;
  return state.graph.x.length > 0;
}
