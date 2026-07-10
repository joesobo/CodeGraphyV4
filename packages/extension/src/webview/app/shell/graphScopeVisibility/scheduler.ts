import type {
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from 'react';
import { visibilityRecordsMatch } from './records';
import type { GraphScopeProjection } from './projection';

export const GRAPH_SCOPE_RENDER_DEBOUNCE_MS = 80;

export interface GraphScopeProjectionRuntime {
  pendingRef: MutableRefObject<GraphScopeProjection | undefined>;
  renderedRef: MutableRefObject<GraphScopeProjection>;
  setRendered: Dispatch<SetStateAction<GraphScopeProjection>>;
  timerRef: MutableRefObject<ReturnType<typeof setTimeout> | undefined>;
}

export function cancelProjectionTimer(
  timerRef: MutableRefObject<ReturnType<typeof setTimeout> | undefined>,
): void {
  clearTimeout(timerRef.current);
  timerRef.current = undefined;
}

function publishPendingProjection(runtime: GraphScopeProjectionRuntime): void {
  runtime.timerRef.current = undefined;
  const pending = runtime.pendingRef.current!;
  runtime.pendingRef.current = undefined;
  runtime.setRendered(pending);
}

export function synchronizeGraphScopeProjection(
  next: GraphScopeProjection,
  runtime: GraphScopeProjectionRuntime,
): void {
  if (visibilityRecordsMatch(
    runtime.renderedRef.current.visibility.nodeVisibility,
    next.visibility.nodeVisibility,
  )) {
    cancelProjectionTimer(runtime.timerRef);
    runtime.pendingRef.current = undefined;
    runtime.setRendered(next);
    return;
  }
  runtime.pendingRef.current = next;
  if (runtime.timerRef.current !== undefined) return;
  runtime.timerRef.current = setTimeout(
    () => { publishPendingProjection(runtime); },
    GRAPH_SCOPE_RENDER_DEBOUNCE_MS,
  );
}
