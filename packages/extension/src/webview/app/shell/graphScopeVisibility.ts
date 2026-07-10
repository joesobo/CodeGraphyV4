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

function visibilityRecordsMatch(
  left: Record<string, boolean>,
  right: Record<string, boolean>,
): boolean {
  if (left === right) return true;
  const leftEntries = Object.entries(left);
  if (leftEntries.length !== Object.keys(right).length) return false;
  return leftEntries.every(([scopeId, enabled]) => right[scopeId] === enabled);
}

function useStableVisibilityRecord(
  visibility: Record<string, boolean>,
): Record<string, boolean> {
  const visibilityRef = useRef(visibility);
  if (!visibilityRecordsMatch(visibilityRef.current, visibility)) {
    visibilityRef.current = visibility;
  }
  return visibilityRef.current;
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
  const stableNodeVisibility = useStableVisibilityRecord(nodeVisibility);
  const stableEdgeVisibility = useStableVisibilityRecord(edgeVisibility);
  const pendingVisibilityRef = useRef<GraphScopeVisibility | undefined>(undefined);
  const renderTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [renderVisibility, setRenderVisibility] = useState<GraphScopeVisibility>({
    edgeVisibility: stableEdgeVisibility,
    nodeVisibility: stableNodeVisibility,
  });
  const incomingVisibility = {
    edgeVisibility: stableEdgeVisibility,
    nodeVisibility: stableNodeVisibility,
  };
  const effectiveRenderVisibility = isEmptyGraphScopeVisibility(renderVisibility)
    && hasGraphScopeVisibilityEntries(incomingVisibility)
    ? incomingVisibility
    : renderVisibility;
  const renderVisibilityRef = useRef(renderVisibility);
  renderVisibilityRef.current = effectiveRenderVisibility;

  useEffect(() => {
    const nextVisibility = {
      edgeVisibility: stableEdgeVisibility,
      nodeVisibility: stableNodeVisibility,
    };
    if (renderVisibilityRef.current.nodeVisibility === stableNodeVisibility) {
      if (renderTimerRef.current !== undefined) {
        clearTimeout(renderTimerRef.current);
        renderTimerRef.current = undefined;
      }
      pendingVisibilityRef.current = undefined;
      setRenderVisibility(nextVisibility);
      return;
    }

    pendingVisibilityRef.current = nextVisibility;
    if (renderTimerRef.current !== undefined) return;

    renderTimerRef.current = setTimeout(() => {
      renderTimerRef.current = undefined;
      const pendingVisibility = pendingVisibilityRef.current;
      pendingVisibilityRef.current = undefined;
      if (pendingVisibility) setRenderVisibility(pendingVisibility);
    }, GRAPH_SCOPE_RENDER_DEBOUNCE_MS);
  }, [stableEdgeVisibility, stableNodeVisibility]);

  useEffect(() => () => {
    if (renderTimerRef.current !== undefined) {
      clearTimeout(renderTimerRef.current);
    }
  }, []);

  return effectiveRenderVisibility;
}
