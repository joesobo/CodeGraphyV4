import { CORE_GRAPH_EDGE_TYPES } from '../../../../../shared/graphControls/defaults/definitions';
import type { GraphEdgeTypeCapabilityLike } from './contracts';

const CORE_GRAPH_EDGE_TYPE_IDS = new Set<string>(CORE_GRAPH_EDGE_TYPES.map(edgeType => edgeType.id));

export function createEdgeCapabilityFilter(
  edgeTypeCapabilities: readonly GraphEdgeTypeCapabilityLike[] | undefined,
): (edgeKind: string) => boolean {
  if (!edgeTypeCapabilities?.length) {
    return () => true;
  }
  if (!edgeTypeCapabilities.some(edgeType => CORE_GRAPH_EDGE_TYPE_IDS.has(edgeType))) {
    return () => true;
  }

  const capabilities = new Set<string>(edgeTypeCapabilities);
  return edgeKind => capabilities.has(edgeKind) || !CORE_GRAPH_EDGE_TYPE_IDS.has(edgeKind);
}
