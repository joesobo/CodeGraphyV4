import type { GraphLayoutConfig, GraphLayoutInput, GraphLayoutState } from '../contracts';
import type { GraphEngineState } from '../engine/state';
import { createGraphLayoutState } from '../initialization';
import { GraphWasmPhysicsKernel } from '../wasm/runtime/kernel';

function indexGraphNodes(nodeIds: readonly string[]): Map<string, number> {
  const indexes = new Map<string, number>();
  nodeIds.forEach((nodeId, index) => {
    if (indexes.has(nodeId)) throw new Error(`Duplicate graph node id: ${nodeId}`);
    indexes.set(nodeId, index);
  });
  return indexes;
}

function maximumRadius(state: GraphLayoutState): number {
  let maximum = 1;
  for (const radius of state.radii) maximum = Math.max(maximum, radius);
  return maximum;
}

export function collisionCellSize(
  config: GraphLayoutConfig,
  maximumRadius: number,
  scale: number,
): number {
  return maximumRadius * 2 * scale + config.collisionPadding;
}

export function createGraphStorage(
  input: GraphLayoutInput,
  config: GraphLayoutConfig,
  collisionScale: number,
  randomState: number,
): Pick<
  GraphEngineState,
  'graph' | 'kernel' | 'maximumCollisionRadius' | 'nodeIds' | 'nodeIndexes'
> {
  const nodeIds = [...input.nodeIds];
  const nodeIndexes = indexGraphNodes(nodeIds);
  const graph = createGraphLayoutState(input, config);
  const maximumCollisionRadius = maximumRadius(graph);
  const kernel = new GraphWasmPhysicsKernel(
    graph,
    config,
    collisionScale,
    collisionCellSize(config, maximumCollisionRadius, collisionScale),
    randomState,
  );
  return {
    graph: kernel.state,
    kernel,
    maximumCollisionRadius,
    nodeIds,
    nodeIndexes,
  };
}

export function replaceGraphStorage(state: GraphEngineState, input: GraphLayoutInput): void {
  const storage = createGraphStorage(
    input,
    state.config,
    state.collisionScale,
    state.kernel.randomState,
  );
  Object.assign(state, storage);
  state.alpha = Math.max(state.alpha, 1);
  state.settled = false;
  state.settledStepCount = 0;
}
