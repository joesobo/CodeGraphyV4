import type { EdgeDecorationPayload } from '../../../shared/plugins/decorations';
import type { IGraphData } from '../../../shared/graph/contracts';
import type { IGraphEdgeTypeDefinition } from '../../../shared/graphControls/contracts';

export function filterSemanticEdges(
  edges: IGraphData['edges'],
  visibleNodeIds: Set<string>,
  edgeVisibility: Record<string, boolean>,
): IGraphData['edges'] {
  return edges.filter((edge) =>
    (edgeVisibility[edge.kind] ?? true)
    && visibleNodeIds.has(edge.from)
    && visibleNodeIds.has(edge.to),
  );
}

export function filterVisibleStructuralEdges(
  edges: IGraphData['edges'],
  visibleNodeIds: Set<string>,
): IGraphData['edges'] {
  return edges.filter((edge) => visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to));
}

export function applyEdgeTypeDefaultColors(
  edges: IGraphData['edges'],
  edgeTypes: IGraphEdgeTypeDefinition[],
): IGraphData['edges'] {
  const colorByKind = new Map(edgeTypes.map((edgeType) => [edgeType.id, edgeType.defaultColor]));

  return edges.map((edge) => {
    const color = edge.color ?? colorByKind.get(edge.kind);
    return color ? { ...edge, color } : edge;
  });
}

export function filterVisibleEdgeDecorations(
  edges: IGraphData['edges'],
  edgeDecorations?: Record<string, EdgeDecorationPayload>,
): Record<string, EdgeDecorationPayload> {
  if (!edgeDecorations) {
    return {};
  }

  const visibleEdgeIds = new Set(edges.map((edge) => edge.id));
  return Object.fromEntries(
    Object.entries(edgeDecorations).filter(([edgeId]) => visibleEdgeIds.has(edgeId)),
  ) as Record<string, EdgeDecorationPayload>;
}
