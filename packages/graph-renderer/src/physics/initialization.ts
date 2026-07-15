import type { GraphLayoutConfig, GraphLayoutInput, GraphLayoutState } from './contracts';
import { validateGraphLayoutEdges } from './edgeValidation';
import { validateGraphLayoutInput } from './inputValidation';
import { createEmptyGraphLayoutState } from './layoutState';
import { updateVisibleLinkDegrees } from './linkDegrees';
import { initializeGraphLayoutNode } from './nodeInitialization';

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
