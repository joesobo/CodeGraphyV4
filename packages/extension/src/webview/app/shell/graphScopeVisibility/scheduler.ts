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
  timerRef: MutableRefObject<ReturnType<typeof setTimeout> | undefined>;
}

const PROJECTION_FRAME_BUDGET_MS = 16;

export function cancelProjectionFrame(
  frameRef: MutableRefObject<number | undefined>,
  timerRef?: MutableRefObject<ReturnType<typeof setTimeout> | undefined>,
): void {
  if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
  frameRef.current = undefined;
  if (timerRef?.current !== undefined) clearTimeout(timerRef.current);
  if (timerRef) timerRef.current = undefined;
}

function publishPendingProjection(runtime: GraphScopeProjectionRuntime): void {
  cancelProjectionFrame(runtime.frameRef, runtime.timerRef);
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
    cancelProjectionFrame(runtime.frameRef, runtime.timerRef);
    runtime.pendingRef.current = undefined;
    runtime.setRendered(next);
    return;
  }
  runtime.pendingRef.current = next;
  if (runtime.frameRef.current !== undefined || runtime.timerRef.current !== undefined) return;
  runtime.frameRef.current = requestAnimationFrame(
    () => { publishPendingProjection(runtime); },
  );
  runtime.timerRef.current = setTimeout(
    () => { publishPendingProjection(runtime); },
    PROJECTION_FRAME_BUDGET_MS,
  );
}
