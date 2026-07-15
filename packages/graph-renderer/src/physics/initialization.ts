import type { GraphLayoutConfig, GraphLayoutInput, GraphLayoutState } from './contracts';
import { validateGraphLayoutEdges } from './validation/edge';
import { validateGraphLayoutInput } from './validation/input';
import { createEmptyGraphLayoutState } from './graph/layout';
import { updateVisibleLinkDegrees } from './linkDegrees';
import { initializeGraphLayoutNode } from './node/initialization';

export function createGraphLayoutState(
  input: GraphLayoutInput,
  config: GraphLayoutConfig,
): GraphLayoutState {
  const nodeCount = input.nodeIds.length;
  validateGraphLayoutInput(input, nodeCount);
  const state = createEmptyGraphLayoutState(input, nodeCount);
  for (let index = 0; index < nodeCount; index += 1) {
    initializeGraphLayoutNode(state, input, index, config.initializationSpacing);
  }
  validateGraphLayoutEdges(state, nodeCount);
  updateVisibleLinkDegrees(state);
  return state;
}
