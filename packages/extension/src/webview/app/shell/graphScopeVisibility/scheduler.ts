import type {
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from 'react';
import { visibilityRecordsMatch } from './records';
import type { GraphScopeProjection } from './projection';

export interface GraphScopeProjectionRuntime {
  frameRef: MutableRefObject<number | undefined>;
  pendingRef: MutableRefObject<GraphScopeProjection | undefined>;
  renderedRef: MutableRefObject<GraphScopeProjection>;
  setRendered: Dispatch<SetStateAction<GraphScopeProjection>>;
}

export function cancelProjectionFrame(
  frameRef: MutableRefObject<number | undefined>,
): void {
  if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
  frameRef.current = undefined;
}

function publishPendingProjection(runtime: GraphScopeProjectionRuntime): void {
  runtime.frameRef.current = undefined;
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
    cancelProjectionFrame(runtime.frameRef);
    runtime.pendingRef.current = undefined;
    runtime.setRendered(next);
    return;
  }
  runtime.pendingRef.current = next;
  if (runtime.frameRef.current !== undefined) return;
  runtime.frameRef.current = requestAnimationFrame(
    () => { publishPendingProjection(runtime); },
  );
}
