import {
  useEffect,
  useRef,
  useState,
} from 'react';
import type { GraphState } from '../../store/state';
import {
  createGraphScopeProjection,
  selectEffectiveProjection,
  type GraphScopeProjection,
} from './graphScopeVisibility/projection';
import { stabilizeVisibilityRecord } from './graphScopeVisibility/records';
import {
  cancelProjectionFrame,
  synchronizeGraphScopeProjection,
} from './graphScopeVisibility/scheduler';

export type { GraphScopeProjection } from './graphScopeVisibility/projection';

function useStableVisibilityRecord(
  visibility: Record<string, boolean>,
): Record<string, boolean> {
  const visibilityRef = useRef(visibility);
  visibilityRef.current = stabilizeVisibilityRecord(visibilityRef.current, visibility);
  return visibilityRef.current;
}

export function useDebouncedGraphScopeVisibility(
  nodeVisibility: GraphState['nodeVisibility'],
  edgeVisibility: GraphState['edgeVisibility'],
  revision: number,
): GraphScopeProjection {
  const stableNodeVisibility = useStableVisibilityRecord(nodeVisibility);
  const stableEdgeVisibility = useStableVisibilityRecord(edgeVisibility);
  const pendingProjectionRef = useRef<GraphScopeProjection | undefined>(undefined);
  const renderFrameRef = useRef<number | undefined>(undefined);
  const renderTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [renderProjection, setRenderProjection] = useState<GraphScopeProjection>(
    createGraphScopeProjection(revision, stableNodeVisibility, stableEdgeVisibility),
  );
  const incomingProjection = createGraphScopeProjection(
    revision,
    stableNodeVisibility,
    stableEdgeVisibility,
  );
  const effectiveRenderProjection = selectEffectiveProjection(
    renderProjection,
    incomingProjection,
  );
  const renderProjectionRef = useRef(renderProjection);
  renderProjectionRef.current = effectiveRenderProjection;

  useEffect(() => {
    synchronizeGraphScopeProjection(createGraphScopeProjection(
      revision,
      stableNodeVisibility,
      stableEdgeVisibility,
    ), {
      frameRef: renderFrameRef,
      pendingRef: pendingProjectionRef,
      renderedRef: renderProjectionRef,
      setRendered: setRenderProjection,
      timerRef: renderTimerRef,
    });
  }, [revision, stableEdgeVisibility, stableNodeVisibility]);

  // Stryker disable ArrayDeclaration: the empty dependency list is React's
  // unmount-only contract; replacing it with another constant list is equivalent.
  useEffect(
    () => () => { cancelProjectionFrame(renderFrameRef, renderTimerRef); },
    [],
  );
  // Stryker restore ArrayDeclaration

  return effectiveRenderProjection;
}
