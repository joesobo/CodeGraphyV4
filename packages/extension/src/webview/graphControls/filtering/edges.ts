import type { EdgeDecorationPayload } from '../../../shared/plugins/decorations';
import type { IGraphData } from '../../../shared/graph/contracts';

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

export function mergeEdgeDecorations(
  edges: IGraphData['edges'],
  edgeColors: Record<string, string>,
  edgeDecorations?: Record<string, EdgeDecorationPayload>,
): Record<string, EdgeDecorationPayload> {
  return Object.fromEntries(
    edges.map((edge) => {
      const existingDecoration = edgeDecorations?.[edge.id] ?? {};
      return [
        edge.id,
        {
          ...existingDecoration,
          color: edgeColors[edge.kind] ?? existingDecoration.color,
        },
      ];
    }),
  ) as Record<string, EdgeDecorationPayload>;
}
