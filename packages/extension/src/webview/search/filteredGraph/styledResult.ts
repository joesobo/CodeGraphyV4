import type { IGraphData } from '../../../shared/graph/contracts';
import type { IGraphEdgeTypeDefinition } from '../../../shared/graphControls/contracts';
import { applyEdgeTypeDefaultColors } from '../../graphControls/filtering/edges';
import { applyNodeTypeColors, withResolvedNodeTypes } from '../../graphControls/filtering/nodes';
import { withSharedEdgeTypeAliases } from '../visibleGraphConfig';
import { cacheReferenceResult, getReferenceResult } from './referenceCache';
import type { ReferenceResultCache } from './referenceCache';

export function getStyledGraphResult({
  cache,
  edgeTypes,
  graph,
  key,
  nodeColors,
}: {
  cache: ReferenceResultCache<IGraphData>;
  edgeTypes: IGraphEdgeTypeDefinition[];
  graph: IGraphData | null;
  key: string;
  nodeColors: Record<string, string>;
}): IGraphData | null {
  if (!graph) {
    return null;
  }

  const cached = getReferenceResult(cache, graph, key);
  if (cached) {
    return cached;
  }

  const edgeTypesForStyling = withSharedEdgeTypeAliases(edgeTypes);
  const result = {
    nodes: applyNodeTypeColors(withResolvedNodeTypes(graph.nodes), nodeColors),
    edges: applyEdgeTypeDefaultColors(graph.edges, edgeTypesForStyling),
  };
  cacheReferenceResult(cache, graph, key, result);
  return result;
}
