import { useEffect, useState } from 'react';
import type { GraphState } from '../../store/state';

export const GRAPH_SCOPE_RENDER_DEBOUNCE_MS = 80;

interface GraphScopeVisibility {
  edgeVisibility: GraphState['edgeVisibility'];
  nodeVisibility: GraphState['nodeVisibility'];
}

export function useDebouncedGraphScopeVisibility(
  nodeVisibility: GraphState['nodeVisibility'],
  edgeVisibility: GraphState['edgeVisibility'],
): GraphScopeVisibility {
  const [renderVisibility, setRenderVisibility] = useState<GraphScopeVisibility>({
    edgeVisibility,
    nodeVisibility,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setRenderVisibility({
        edgeVisibility,
        nodeVisibility,
      });
    }, GRAPH_SCOPE_RENDER_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [edgeVisibility, nodeVisibility]);

  return renderVisibility;
}
