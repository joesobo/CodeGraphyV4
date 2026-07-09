import { describe, expect, it } from 'vitest';

import {
  perfControlMessageSchema,
  perfEventMessageSchema,
} from '../../../src/shared/perf/protocol';

const operation = {
  operationId: 'operation-1',
  runId: 'run-1',
  scenario: 'cold-open',
  dimension: 'small',
} as const;

describe('shared/perf/protocol', () => {
  it('parses an arm-graph control with deterministic operation context', () => {
    const message = {
      type: 'PERF_CONTROL',
      payload: {
        kind: 'arm-graph',
        operation,
      },
    } as const;

    expect(perfControlMessageSchema.parse(message)).toEqual(message);
  });

  it('parses a disarm-graph control for one operation', () => {
    const message = {
      type: 'PERF_CONTROL',
      payload: {
        kind: 'disarm-graph',
        operationId: operation.operationId,
      },
    } as const;

    expect(perfControlMessageSchema.parse(message)).toEqual(message);
  });

  it('rejects an unknown field inside an operation', () => {
    expect(perfControlMessageSchema.safeParse({
      type: 'PERF_CONTROL',
      payload: {
        kind: 'arm-graph',
        operation: { ...operation, unexpected: true },
      },
    }).success).toBe(false);
  });

  it.each([
    {
      kind: 'graph-applied',
      layoutChanged: true,
      nodeCount: 100,
      edgeCount: 75,
    },
    { kind: 'physics-settled' },
    {
      kind: 'scope-inventory',
      entries: [
        { scopeKind: 'node', scopeId: 'file', enabled: true },
        { scopeKind: 'edge', scopeId: 'imports', enabled: false },
      ],
    },
    {
      kind: 'scope-toggle-complete',
      scopeKind: 'node',
      scopeId: 'file',
      enabled: false,
    },
    {
      kind: 'scope-persist-complete',
      scopeKind: 'edge',
      scopeId: 'imports',
      enabled: true,
    },
    {
      kind: 'interaction-complete',
      interaction: 'burst',
      durationMs: 48,
    },
    {
      kind: 'idle-complete',
      durationMs: 60_000,
    },
  ] as const)('parses a $kind event with operation context', event => {
    const message = {
      type: 'PERF_EVENT',
      payload: { ...operation, ...event },
    };

    expect(perfEventMessageSchema.parse(message)).toEqual(message);
  });

  it.each([
    ['payloadBytes', 'bytes'],
    ['layoutResets', 'count'],
    ['scopeToggleMs', 'ms'],
    ['settleTimeMs', 'ms'],
    ['simTicksAfterSettle', 'count'],
  ] as const)('parses the %s metric with its required unit', (metric, unit) => {
    const message = {
      type: 'PERF_EVENT',
      payload: {
        ...operation,
        kind: 'metric',
        metric,
        value: 12,
        unit,
      },
    } as const;

    expect(perfEventMessageSchema.parse(message)).toEqual(message);
  });

  it('rejects a metric with the wrong unit', () => {
    expect(perfEventMessageSchema.safeParse({
      type: 'PERF_EVENT',
      payload: {
        ...operation,
        kind: 'metric',
        metric: 'payloadBytes',
        value: 12,
        unit: 'ms',
      },
    }).success).toBe(false);
  });

  it('rejects an unknown event field', () => {
    expect(perfEventMessageSchema.safeParse({
      type: 'PERF_EVENT',
      payload: {
        ...operation,
        kind: 'physics-settled',
        unexpected: true,
      },
    }).success).toBe(false);
  });
});
