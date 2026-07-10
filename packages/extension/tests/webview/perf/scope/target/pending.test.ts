import { describe, expect, it, vi } from 'vitest';

import type { PerfOperation, PerfScopeEntry } from '../../../../../src/shared/perf/protocol';
import { createPendingScopeToggle } from '../../../../../src/webview/perf/scope/target/model';
import {
  cancelPendingToggle,
  clearPendingToggleWhenComplete,
  markPendingTogglePosted,
} from '../../../../../src/webview/perf/scope/target/pending';

const operation: PerfOperation = {
  dimension: 'large',
  operationId: 'operation-1',
  runId: 'run-1',
  scenario: 'scope-toggle',
};
const entry: PerfScopeEntry = {
  scopeKind: 'node',
  scopeId: 'file',
  enabled: false,
};

describe('webview/perf/scope/target/pending', () => {
  it('clears only the active fully acknowledged candidate', () => {
    const candidate = createPendingScopeToggle(operation, entry);
    const stale = createPendingScopeToggle(operation, entry);
    candidate.toggled = true;
    candidate.persisted = true;

    expect(clearPendingToggleWhenComplete(candidate, candidate)).toBeUndefined();
    expect(clearPendingToggleWhenComplete(stale, candidate)).toBe(stale);
    candidate.persisted = false;
    expect(clearPendingToggleWhenComplete(candidate, candidate)).toBe(candidate);
    candidate.persisted = true;
    candidate.toggled = false;
    expect(clearPendingToggleWhenComplete(candidate, candidate)).toBe(candidate);
  });

  it('marks only the active candidate as posted', () => {
    const candidate = createPendingScopeToggle(operation, entry);
    const stale = createPendingScopeToggle(operation, entry);

    markPendingTogglePosted(stale, candidate);
    expect(candidate.posted).toBe(false);
    markPendingTogglePosted(candidate, candidate);
    expect(candidate.posted).toBe(true);
  });

  it('cancels a scheduled frame and always clears pending state', () => {
    const cancelFrame = vi.fn();
    const candidate = createPendingScopeToggle(operation, entry);
    candidate.frame = 7;

    expect(cancelPendingToggle(candidate, cancelFrame)).toBeUndefined();
    expect(cancelFrame).toHaveBeenCalledWith(7);
    cancelFrame.mockClear();
    expect(cancelPendingToggle(undefined, cancelFrame)).toBeUndefined();
    expect(cancelFrame).not.toHaveBeenCalled();
  });
});
