import { describe, expect, it } from 'vitest';

import type { PerfOperation, PerfScopeEntry } from '../../../../../src/shared/perf/protocol';
import { createPendingScopeToggle } from '../../../../../src/webview/perf/scope/target/model';

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

describe('webview/perf/scope/target/model', () => {
  it('creates an unacknowledged pending toggle', () => {
    expect(createPendingScopeToggle(operation, entry)).toEqual({
      entry,
      frame: undefined,
      operation,
      projectionRevision: 0,
      persisted: false,
      posted: false,
      toggled: false,
    });
  });
});
