import type {
  PerfEventPayload,
  PerfScopeEntry,
} from '../../../../../shared/perf/protocol';
import {
  receivePersistence,
  receiveToggleComplete,
  receiveToggleRejection,
} from './acknowledgements';
import { createToggleWaiterState } from './model';
import { receiveGraphCommit, receivePhysicsSettle } from './projection';
import { completeToggleWhenReady, pendingToggleEvents } from './readiness';

export interface ToggleWaiter {
  pendingDescription(): string;
  promise: Promise<number>;
  receive(event: PerfEventPayload): void;
}

export function createToggleWaiter(
  expected: PerfScopeEntry,
  now: () => number,
  startedAt: number,
): ToggleWaiter {
  const state = createToggleWaiterState();
  let reject: (error: Error) => void = () => {};
  let resolve: (elapsedMs: number) => void = () => {};
  const promise = new Promise<number>((complete, fail) => {
    resolve = complete;
    reject = fail;
  });

  return {
    pendingDescription: () => pendingToggleEvents(state),
    promise,
    receive(event): void {
      switch (event.kind) {
        case 'scope-toggle-complete':
          receiveToggleComplete(state, event, expected);
          break;
        case 'scope-toggle-rejected':
          receiveToggleRejection(event, expected, reject);
          break;
        case 'scope-persist-complete':
          receivePersistence(state, event, expected);
          break;
        case 'graph-applied':
          receiveGraphCommit(state, event, expected, now, startedAt);
          break;
        case 'physics-settled':
          receivePhysicsSettle(state, event);
          break;
      }
      completeToggleWhenReady(state, resolve);
    },
  };
}
