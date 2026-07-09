import { describe, expect, it } from 'vitest';

import { createPerfOperation } from '../../../src/extension/perf/operationId';

describe('extension/perf/operationId', () => {
  it('creates a deterministic operation identifier', () => {
    expect(createPerfOperation({
      runId: 'run-1',
      scenario: 'single-save',
      dimension: 'medium',
      ordinal: 2,
    })).toEqual({
      operationId: 'run-1:single-save:medium:2',
      runId: 'run-1',
      scenario: 'single-save',
      dimension: 'medium',
    });
  });

  it('rejects a negative operation ordinal', () => {
    expect(() => createPerfOperation({
      runId: 'run-1',
      scenario: 'single-save',
      dimension: 'medium',
      ordinal: -1,
    })).toThrow('ordinal');
  });
});
