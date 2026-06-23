import { useEffect, useState } from 'react';
import type { GraphState } from '../../store/state';
import { recordWebviewPerformanceEvent } from '../../performance/marks';

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
      recordWebviewPerformanceEvent('graphScope.visibility.renderDebounced', {
        edgeVisibilityCount: Object.keys(edgeVisibility).length,
        nodeVisibilityCount: Object.keys(nodeVisibility).length,
      });
      setRenderVisibility({
        edgeVisibility,
        nodeVisibility,
      });
    }, GRAPH_SCOPE_RENDER_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [edgeVisibility, nodeVisibility]);

  return renderVisibility;
}
