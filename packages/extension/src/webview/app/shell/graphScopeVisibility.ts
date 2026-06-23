import { useEffect, useRef, useState } from 'react';
import type { GraphState } from '../../store/state';

export const GRAPH_SCOPE_RENDER_DEBOUNCE_MS = 80;

interface GraphScopeVisibility {
  edgeVisibility: GraphState['edgeVisibility'];
  nodeVisibility: GraphState['nodeVisibility'];
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

export function useDebouncedGraphScopeVisibility(
  nodeVisibility: GraphState['nodeVisibility'],
  edgeVisibility: GraphState['edgeVisibility'],
): GraphScopeVisibility {
  const [renderVisibility, setRenderVisibility] = useState<GraphScopeVisibility>({
    edgeVisibility,
    nodeVisibility,
  });
  const incomingVisibility = {
    edgeVisibility,
    nodeVisibility,
  };
  const effectiveRenderVisibility = isEmptyGraphScopeVisibility(renderVisibility)
    && hasGraphScopeVisibilityEntries(incomingVisibility)
    ? incomingVisibility
    : renderVisibility;
  const renderVisibilityRef = useRef(renderVisibility);
  renderVisibilityRef.current = effectiveRenderVisibility;

  useEffect(() => {
    if (renderVisibilityRef.current.nodeVisibility === nodeVisibility) {
      setRenderVisibility({
        edgeVisibility,
        nodeVisibility,
      });
      return;
    }

    const timer = setTimeout(() => {
      setRenderVisibility({
        edgeVisibility,
        nodeVisibility,
      });
    }, GRAPH_SCOPE_RENDER_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [edgeVisibility, nodeVisibility]);

  return effectiveRenderVisibility;
}
