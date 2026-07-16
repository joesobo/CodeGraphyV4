import type { IGraphData } from '../../../../../shared/graph/contracts';
import { STRUCTURAL_NESTS_EDGE_KIND } from '../../../../../shared/graphControls/defaults/definitions';
import { isFileNode } from '../../../../../shared/visibleGraph/model';
import type { GraphEdgeTypeCapabilityLike } from './contracts';
import { createEdgeCapabilityFilter } from './edgeCapabilityFilter';

export function collectAvailableEdgeKinds(
  graphData: IGraphData,
  edgeTypeCapabilities: readonly GraphEdgeTypeCapabilityLike[] | undefined,
): Set<string> {
  const edgeKinds = collectCapabilityEdgeKinds(edgeTypeCapabilities);
  const capabilityFilter = createEdgeCapabilityFilter(edgeTypeCapabilities);

  for (const edge of graphData.edges) {
    if (capabilityFilter(edge.kind)) {
      edgeKinds.add(edge.kind);
    }
  }

  addStructuralEdgeKinds(edgeKinds, graphData);
  return edgeKinds;
}

function addStructuralEdgeKinds(edgeKinds: Set<string>, graphData: IGraphData): void {
  if (!graphData.nodes.some(isFileNode)) {
    return;
  }
  if (edgeKinds.size > 0 && shouldAddLegacyReferenceEdgeKind(edgeKinds)) {
    edgeKinds.add('reference');
  }
  edgeKinds.add(STRUCTURAL_NESTS_EDGE_KIND);
}

export function collectCapabilityEdgeKinds(
  edgeTypeCapabilities: readonly GraphEdgeTypeCapabilityLike[] | undefined,
): Set<string> {
  return new Set<string>(edgeTypeCapabilities ?? []);
}

function shouldAddLegacyReferenceEdgeKind(edgeKinds: ReadonlySet<string>): boolean {
  return !edgeKinds.has('overrides')
    && !edgeKinds.has('type')
    && !edgeKinds.has('type-import');
}
