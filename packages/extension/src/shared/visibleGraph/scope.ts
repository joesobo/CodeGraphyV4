import type { IGraphData } from '../graph/contracts';
import type { VisibleGraphScopeConfig } from './contracts';
import { getDisabledTypes } from './model';
import { getScopedSymbolDefinitions } from './scope/definitions';
import { resolveScopedEdges } from './scope/edges';
import { getGraphEvidenceIndex } from './scope/evidenceIndex';
import { nodeMatchesScope } from './scope/nodes';

function preserveUnchangedCollection<T>(source: T[], projected: T[]): T[] {
  return source.length === projected.length
    && projected.every((item, index) => item === source[index])
    ? source
    : projected;
}

export function applyGraphScope(
  graphData: IGraphData,
  scope: VisibleGraphScopeConfig,
): IGraphData {
  const disabledNodeTypes = getDisabledTypes(scope.nodes);
	const scopedSymbolDefinitions = getScopedSymbolDefinitions(scope);
	const disabledEdgeTypes = getDisabledTypes(scope.edges);
	const evidenceIndex = getGraphEvidenceIndex(graphData);
	const nodes = preserveUnchangedCollection(graphData.nodes, graphData.nodes.filter((node) => nodeMatchesScope(
		node,
		disabledNodeTypes,
		scopedSymbolDefinitions,
	)));
	const hasPresentDisabledEdge = [...disabledEdgeTypes].some(kind =>
		evidenceIndex.edgeIdsByKind.has(kind)
	);
	const scopedEdges = hasPresentDisabledEdge
		? graphData.edges.filter((edge) => !disabledEdgeTypes.has(edge.kind))
		: graphData.edges;
	const edges = preserveUnchangedCollection(
		graphData.edges,
		resolveScopedEdges(nodes, graphData.nodes, scopedEdges),
	);
	return nodes === graphData.nodes && edges === graphData.edges
		? graphData
		: { nodes, edges };
}
