import type { GraphState } from '../../../store/state';

export interface GraphScopeVisibility {
  edgeVisibility: GraphState['edgeVisibility'];
  nodeVisibility: GraphState['nodeVisibility'];
}

export interface GraphScopeProjection {
  revision: number;
  visibility: GraphScopeVisibility;
}

function hasVisibilityEntries(visibility: Record<string, boolean>): boolean {
  return Object.keys(visibility).length > 0;
}

function isEmptyGraphScopeVisibility(visibility: GraphScopeVisibility): boolean {
  return !hasVisibilityEntries(visibility.nodeVisibility)
    && !hasVisibilityEntries(visibility.edgeVisibility);
}

function hasGraphScopeVisibilityEntries(visibility: GraphScopeVisibility): boolean {
  return hasVisibilityEntries(visibility.nodeVisibility)
    || hasVisibilityEntries(visibility.edgeVisibility);
}

export function createGraphScopeProjection(
  revision: number,
  nodeVisibility: GraphState['nodeVisibility'],
  edgeVisibility: GraphState['edgeVisibility'],
): GraphScopeProjection {
  return { revision, visibility: { edgeVisibility, nodeVisibility } };
}

export function selectEffectiveProjection(
  rendered: GraphScopeProjection,
  incoming: GraphScopeProjection,
): GraphScopeProjection {
  return isEmptyGraphScopeVisibility(rendered.visibility)
    && hasGraphScopeVisibilityEntries(incoming.visibility)
    ? incoming
    : rendered;
}
