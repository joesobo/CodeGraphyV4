import { describe, expect, it } from 'vitest';

import { createToggleWaiterState } from '../../../../../../src/extension/perf/scope/waiters/toggle/model';

describe('extension/perf/scope/waiters/toggle/model', () => {
  it('starts with no acknowledgements or rendered projections', () => {
    const state = createToggleWaiterState();

    expect(state).toEqual({
      graphApplied: undefined,
      graphAppliedElapsedMs: undefined,
      graphAppliedPhysicsSettled: false,
      graphAppliedRevisions: new Map(),
      persisted: false,
      scopeProjectionRevision: -1,
      toggled: false,
    });
  });
});
