import type { EdgeDecoration, NodeDecoration } from '../../../../core/plugins/decoration/manager';
import type { EdgeDecorationPayload, NodeDecorationPayload } from '../../../../shared/plugins/decorations';

export interface IGraphViewDecorationPayload {
  nodeDecorations: Record<string, NodeDecorationPayload>;
  edgeDecorations: Record<string, EdgeDecorationPayload>;
}

export function buildGraphViewDecorationPayload(
  nodeDecorations: Iterable<[string, NodeDecoration]>,
  edgeDecorations: Iterable<[string, EdgeDecoration]>,
): IGraphViewDecorationPayload {
  const serializedNodeDecorations = Object.fromEntries(
    [...nodeDecorations].map(([id, decoration]) => {
      const { priority, ...payload } = decoration;
      void priority;
      return [id, payload];
    }),
  ) as Record<string, NodeDecorationPayload>;

  const serializedEdgeDecorations = Object.fromEntries(
    [...edgeDecorations].map(([id, decoration]) => {
      const { priority, ...payload } = decoration;
      void priority;
      return [id, payload];
    }),
  ) as Record<string, EdgeDecorationPayload>;

  return {
    nodeDecorations: serializedNodeDecorations,
    edgeDecorations: serializedEdgeDecorations,
  };
}
