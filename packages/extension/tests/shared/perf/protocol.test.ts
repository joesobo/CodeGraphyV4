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

  it('parses an explicitly correlated interaction burst control', () => {
    const message = {
      type: 'PERF_CONTROL',
      payload: {
        kind: 'run-interaction-burst',
        operationId: operation.operationId,
      },
    } as const;

    expect(perfControlMessageSchema.parse(message)).toEqual(message);
  });

  it('parses an explicitly correlated idle watch duration', () => {
    const message = {
      type: 'PERF_CONTROL',
      payload: {
        kind: 'run-idle-watch',
        operationId: operation.operationId,
        durationMs: 60_000,
      },
    } as const;

    expect(perfControlMessageSchema.parse(message)).toEqual(message);
  });

  it('parses an explicitly correlated scope inventory request', () => {
    const message = {
      type: 'PERF_CONTROL',
      payload: {
        kind: 'request-scope-inventory',
        operationId: operation.operationId,
      },
    } as const;

    expect(perfControlMessageSchema.parse(message)).toEqual(message);
  });

  it('parses an explicitly correlated scope toggle', () => {
    const message = {
      type: 'PERF_CONTROL',
      payload: {
        kind: 'toggle-scope',
        operationId: operation.operationId,
        scopeKind: 'node',
        scopeId: 'file',
        enabled: false,
      },
    } as const;

    expect(perfControlMessageSchema.parse(message)).toEqual(message);
  });

  it('rejects unknown scope toggle fields', () => {
    expect(perfControlMessageSchema.safeParse({
      type: 'PERF_CONTROL',
      payload: {
        kind: 'toggle-scope',
        operationId: operation.operationId,
        scopeKind: 'node',
        scopeId: 'file',
        enabled: false,
        unexpected: true,
      },
    }).success).toBe(false);
  });

  it('rejects a non-positive idle watch duration', () => {
    expect(perfControlMessageSchema.safeParse({
      type: 'PERF_CONTROL',
      payload: {
        kind: 'run-idle-watch',
        operationId: operation.operationId,
        durationMs: 0,
      },
    }).success).toBe(false);
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
    { kind: 'idle-started', durationMs: 60_000 },
    { kind: 'scope-inventory-rejected', reason: 'target-unavailable' },
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
      kind: 'scope-toggle-rejected',
      scopeKind: 'node',
      scopeId: 'file',
      enabled: false,
      reason: 'target-unavailable',
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

  it('parses a graph application with its strict applied scope visibility', () => {
    const message = {
      type: 'PERF_EVENT',
      payload: {
        ...operation,
        kind: 'graph-applied',
        layoutChanged: false,
        nodeCount: 100,
        edgeCount: 75,
        scopeVisibility: {
          nodeVisibility: { file: true, folder: false },
          edgeVisibility: { import: true },
        },
      },
    } as const;

    expect(perfEventMessageSchema.parse(message)).toEqual(message);
  });

  it.each([
    { nodeVisibility: { file: true } },
    {
      edgeVisibility: {},
      nodeVisibility: { file: true },
      unexpected: true,
    },
  ])('rejects an incomplete or extended applied scope visibility', scopeVisibility => {
    expect(perfEventMessageSchema.safeParse({
      type: 'PERF_EVENT',
      payload: {
        ...operation,
        kind: 'graph-applied',
        layoutChanged: false,
        nodeCount: 100,
        edgeCount: 75,
        scopeVisibility,
      },
    }).success).toBe(false);
  });

  it.each([
    ['payloadBytes', 'bytes'],
    ['layoutResets', 'count'],
    ['scopeToggleMs', 'ms'],
    ['settleTimeMs', 'ms'],
    ['simTicksAfterSettle', 'count'],
    ['fpsIdle', 'fps'],
    ['fpsDrag', 'fps'],
    ['fpsSettle', 'fps'],
    ['longTasksPerInteraction', 'count'],
    ['heapUsedBytes', 'bytes'],
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
