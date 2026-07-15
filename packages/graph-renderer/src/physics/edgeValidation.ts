import type { GraphLayoutState } from './contracts';

export function validateGraphLayoutEdges(state: GraphLayoutState, nodeCount: number): void {
  for (let edge = 0; edge < state.edgeSources.length; edge += 1) {
    if (state.edgeSources[edge] >= nodeCount || state.edgeTargets[edge] >= nodeCount) {
      throw new Error(`Edge ${edge} references a missing node`);
    }
  }
}
