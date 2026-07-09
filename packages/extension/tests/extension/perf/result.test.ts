import { describe, expect, it } from 'vitest';
import { perfScenarioResultSchema } from '../../../src/extension/perf/result';

const metric = {
  metric: 'fileOpRoundtripMs',
  operationId: 'run-1:rename:small:0',
  unit: 'ms',
  value: 12,
} as const;

describe('extension/perf/result', () => {
  it('parses a strict rename comparison result', () => {
    const value = {
      comparison: {
        codeGraphyRevealMs: 7,
        explorer: { explorerRenameMs: 11, explorerRevealMs: 5 },
      },
      metrics: [metric],
      runId: 'run-1',
      scenario: 'rename',
    };

    expect(perfScenarioResultSchema.parse(value)).toEqual(value);
  });

  it('accepts a result without an optional comparison payload', () => {
    const value = {
      metrics: [],
      runId: 'run-open',
      scenario: 'cold-open',
    };

    expect(perfScenarioResultSchema.parse(value)).toEqual(value);
  });

  it('rejects a comparison payload from another scenario', () => {
    const result = perfScenarioResultSchema.safeParse({
      comparison: { explorer: { explorerDeleteMs: 9 } },
      metrics: [metric],
      runId: 'run-1',
      scenario: 'create',
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected comparison validation to fail');
    expect(result.error.issues).toContainEqual({
      code: 'custom',
      message: 'Comparison payload does not match scenario create',
      path: ['comparison'],
    });
  });

  it('rejects unknown top-level result fields', () => {
    expect(() => perfScenarioResultSchema.parse({
      metrics: [],
      runId: 'run-open',
      scenario: 'cold-open',
      unexpected: true,
    })).toThrow();
  });
});
