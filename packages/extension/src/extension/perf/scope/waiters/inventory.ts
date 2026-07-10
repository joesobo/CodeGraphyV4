import type {
  PerfEventPayload,
  PerfScopeEntry,
} from '../../../../shared/perf/protocol';
import { sortEntries } from '../entries';

export interface InventoryWaiter {
  promise: Promise<PerfScopeEntry[]>;
  receive(event: PerfEventPayload): void;
}

export function createInventoryWaiter(): InventoryWaiter {
  let reject: (error: Error) => void = () => {};
  let resolve: (entries: PerfScopeEntry[]) => void = () => {};
  const promise = new Promise<PerfScopeEntry[]>((complete, fail) => {
    resolve = complete;
    reject = fail;
  });

  return {
    promise,
    receive(event): void {
      if (event.kind === 'scope-inventory') resolve(sortEntries(event.entries));
      if (event.kind === 'scope-inventory-rejected') {
        reject(new Error(`Scope inventory was rejected: ${event.reason}`));
      }
    },
  };
}
