import { describe, expect, it, vi } from 'vitest';

import type { CorrelatedControlOperationRuntime } from '../../../../src/extension/perf/controlOperation';
import { runScopeToggleScenario } from '../../../../src/extension/perf/scope/battery';
import type {
  PerfControlMessage,
  PerfEventInput,
  PerfEventMessage,
  PerfOperation,
  PerfScopeEntry,
} from '../../../../src/shared/perf/protocol';

interface HarnessOptions {
  afterToggle?: (entry: PerfScopeEntry, state: Map<string, PerfScopeEntry>) => void;
  duplicateGraphBeforePersist?: boolean;
  emitPreviousGraphOnRearm?: boolean;
  failFirstPhysics?: boolean;
  layoutChanged?: (entry: PerfScopeEntry, toggleIndex: number) => boolean;
  rejectInventory?: boolean;
  rejectFirstToggle?: 'target-unavailable' | 'toggle-unavailable';
}

function createHarness(initialEntries: PerfScopeEntry[], options: HarnessOptions = {}) {
  const controls: PerfControlMessage[] = [];
  const handlers = new Set<(message: unknown) => void>();
  const emitMetric = vi.fn();
  const metricSession = { dispose: vi.fn() };
  const subscription = { dispose: vi.fn() };
  const state = new Map(initialEntries.map(entry => [
    `${entry.scopeKind}:${entry.scopeId}`,
    { ...entry },
  ]));
  let armedOperation: PerfOperation | undefined;
  let clock = 0;
  let previousToggleOperation: PerfOperation | undefined;
  let toggleIndex = 0;
  let failedPhysics = false;

  const emitFor = (operation: PerfOperation, event: PerfEventInput): void => {
    const message = {
      type: 'PERF_EVENT',
      payload: { ...operation, ...event },
    } as PerfEventMessage;
    queueMicrotask(() => {
      for (const handler of handlers) handler(message);
    });
  };
  const emit = (event: PerfEventInput): void => {
    if (!armedOperation) throw new Error('Expected an armed operation');
    emitFor(armedOperation, event);
  };

  const runtime: CorrelatedControlOperationRuntime = {
    emitMetric,
    now: vi.fn(() => {
      clock += 5;
      return clock;
    }),
    onMessage(handler) {
      handlers.add(handler);
      return subscription;
    },
    sendControl(message) {
      controls.push(message);
      const control = message.payload;
      if (control.kind === 'arm-graph') {
        armedOperation = control.operation;
        if (options.emitPreviousGraphOnRearm && previousToggleOperation) {
          emitFor(previousToggleOperation, {
            kind: 'graph-applied',
            layoutChanged: false,
            nodeCount: 999,
            edgeCount: 999,
          });
          previousToggleOperation = undefined;
        }
        return;
      }
      if (control.kind === 'disarm-graph') {
        armedOperation = undefined;
        return;
      }
      if (control.kind === 'request-scope-inventory') {
        if (options.rejectInventory) {
          emit({ kind: 'scope-inventory-rejected', reason: 'target-unavailable' });
          return;
        }
        emit({
          kind: 'scope-inventory',
          entries: [...state.values()].sort((left, right) =>
            `${left.scopeKind}:${left.scopeId}`.localeCompare(`${right.scopeKind}:${right.scopeId}`)
          ),
        });
        return;
      }
      if (control.kind !== 'toggle-scope') return;

      toggleIndex += 1;
      const entry = {
        scopeKind: control.scopeKind,
        scopeId: control.scopeId,
        enabled: control.enabled,
      } satisfies PerfScopeEntry;
      if (toggleIndex === 1 && options.rejectFirstToggle) {
        emit({
          kind: 'scope-toggle-rejected',
          ...entry,
          reason: options.rejectFirstToggle,
        });
        return;
      }
      state.set(`${entry.scopeKind}:${entry.scopeId}`, entry);
      options.afterToggle?.(entry, state);
      previousToggleOperation = armedOperation;
      const layoutChanged = options.layoutChanged?.(entry, toggleIndex) ?? false;
      emit({ kind: 'scope-toggle-complete', ...entry });
      emit({
        kind: 'graph-applied',
        layoutChanged,
        nodeCount: 1,
        edgeCount: 0,
      });
      if (options.duplicateGraphBeforePersist) {
        emit({
          kind: 'graph-applied',
          layoutChanged,
          nodeCount: 2,
          edgeCount: 0,
        });
      }
      emit({ kind: 'scope-persist-complete', ...entry });
      if (layoutChanged && (!options.failFirstPhysics || failedPhysics)) {
        emit({ kind: 'physics-settled' });
      } else if (layoutChanged) {
        failedPhysics = true;
      }
    },
    startMetricSession: vi.fn(() => metricSession),
  };

  return { controls, emitMetric, metricSession, runtime, state, subscription };
}

const input = {
  dimension: 'large',
  ordinal: 0,
  runId: 'run-1',
} as const;

describe('extension/perf/scope/battery', () => {
  it('correlates each sequential toggle while measuring every row away and back three times', async () => {
    const entries: PerfScopeEntry[] = [
      { scopeKind: 'node', scopeId: 'file', enabled: true },
      { scopeKind: 'edge', scopeId: 'imports', enabled: false },
    ];
    const harness = createHarness(entries);
    const deferredInput = {
      ...input,
      provider: { ignored: true },
      runOperation: vi.fn(),
      scenario: 'scope-toggle' as const,
      workspaceFolderUri: { ignored: true },
    };

    await expect(runScopeToggleScenario(deferredInput, harness.runtime, { timeoutMs: 100 })).resolves.toEqual({
      dimension: 'large',
      entryCount: 2,
      operationId: 'run-1:scope-toggle:large:0',
      scenario: 'scope-toggle',
      toggleCount: 12,
    });

    const kinds = harness.controls.map(message => message.payload.kind);
    expect(kinds.filter(kind => kind === 'toggle-scope')).toHaveLength(12);
    const toggleOperationIds = harness.controls.flatMap(message =>
      message.payload.kind === 'toggle-scope' ? [message.payload.operationId] : []
    );
    expect(new Set(toggleOperationIds).size).toBe(12);
    const armedOperationIds = new Set(harness.controls.flatMap(message =>
      message.payload.kind === 'arm-graph' ? [message.payload.operation.operationId] : []
    ));
    expect(toggleOperationIds.every(operationId => armedOperationIds.has(operationId))).toBe(true);
    expect(kinds.at(-1)).toBe('disarm-graph');
    expect([...harness.state.values()]).toEqual(expect.arrayContaining(entries));
    expect(harness.emitMetric).toHaveBeenCalledTimes(12);
    expect(harness.emitMetric.mock.calls.map(([metric]) => metric)).toEqual([
      ...Array.from({ length: 6 }, () => expect.objectContaining({
        dimension: 'edge:imports',
        metric: 'scopeToggleMs',
        value: 5,
      })),
      ...Array.from({ length: 6 }, () => expect.objectContaining({
        dimension: 'node:file',
        metric: 'scopeToggleMs',
        value: 5,
      })),
    ]);
    expect(harness.metricSession.dispose).toHaveBeenCalledOnce();
    expect(harness.subscription.dispose).toHaveBeenCalledOnce();
  });

  it('ignores a previous toggle graph commit after the next toggle is armed', async () => {
    const harness = createHarness([
      { scopeKind: 'node', scopeId: 'file', enabled: true },
    ], { emitPreviousGraphOnRearm: true });

    await expect(runScopeToggleScenario(input, harness.runtime, { timeoutMs: 100 }))
      .resolves.toMatchObject({ toggleCount: 6 });

    expect(harness.emitMetric).toHaveBeenCalledTimes(6);
    expect(harness.emitMetric.mock.calls.map(([metric]) => metric.value)).toEqual([
      5, 5, 5, 5, 5, 5,
    ]);
  });

  it('latches the first graph commit when persistence arrives after duplicate commits', async () => {
    const harness = createHarness([
      { scopeKind: 'node', scopeId: 'file', enabled: true },
    ], { duplicateGraphBeforePersist: true });

    await expect(runScopeToggleScenario(input, harness.runtime, { timeoutMs: 100 }))
      .resolves.toMatchObject({ toggleCount: 6 });

    expect(harness.emitMetric.mock.calls.map(([metric]) => metric.value)).toEqual([
      5, 5, 5, 5, 5, 5,
    ]);
  });

  it('does not wait for physics when graph-applied reports no layout change', async () => {
    const harness = createHarness([
      { scopeKind: 'node', scopeId: 'file', enabled: true },
    ], { layoutChanged: () => false });

    await expect(runScopeToggleScenario(input, harness.runtime, { timeoutMs: 100 })).resolves.toMatchObject({
      toggleCount: 6,
    });
  });

  it('normalizes parent side effects before measuring the next row', async () => {
    const entries: PerfScopeEntry[] = [
      { scopeKind: 'node', scopeId: 'symbol:constant', enabled: false },
      { scopeKind: 'node', scopeId: 'variable', enabled: false },
    ];
    const harness = createHarness(entries, {
      afterToggle(entry, state) {
        if (entry.scopeId === 'symbol:constant' && entry.enabled) {
          state.set('node:variable', {
            scopeKind: 'node',
            scopeId: 'variable',
            enabled: true,
          });
        }
      },
    });

    await expect(runScopeToggleScenario(input, harness.runtime, { timeoutMs: 100 }))
      .resolves.toMatchObject({ toggleCount: 12 });

    const variableToggles = harness.controls.filter(message =>
      message.payload.kind === 'toggle-scope'
      && message.payload.scopeId === 'variable'
    );
    expect(variableToggles).toHaveLength(7);
    expect(variableToggles[0]?.payload).toMatchObject({
      enabled: false,
      kind: 'toggle-scope',
    });
    expect(harness.emitMetric).toHaveBeenCalledTimes(12);
  });

  it('restores and verifies original values when a changed layout never settles', async () => {
    const original: PerfScopeEntry = { scopeKind: 'node', scopeId: 'file', enabled: true };
    const harness = createHarness([original], {
      failFirstPhysics: true,
      layoutChanged: (_entry, toggleIndex) => toggleIndex === 1,
    });

    await expect(runScopeToggleScenario(input, harness.runtime, { timeoutMs: 10 }))
      .rejects.toThrow('physics-settled');

    expect(harness.state.get('node:file')).toEqual(original);
    const lastToggle = harness.controls
      .filter(message => message.payload.kind === 'toggle-scope')
      .at(-1);
    expect(lastToggle?.payload.kind).toBe('toggle-scope');
    if (lastToggle?.payload.kind !== 'toggle-scope') {
      throw new Error('Expected a restoration toggle');
    }
    expect(lastToggle.payload.enabled).toBe(true);
    expect(harness.controls.at(-1)?.payload.kind).toBe('disarm-graph');
  });

  it('rejects promptly when the webview cannot execute a scope toggle', async () => {
    const harness = createHarness([
      { scopeKind: 'node', scopeId: 'file', enabled: true },
    ], { rejectFirstToggle: 'target-unavailable' });

    await expect(runScopeToggleScenario(input, harness.runtime, { timeoutMs: 1_000 }))
      .rejects.toThrow('target-unavailable');

    expect(harness.controls.filter(message => message.payload.kind === 'toggle-scope'))
      .toHaveLength(1);
  });

  it('rejects promptly when the webview has no scope inventory target', async () => {
    const harness = createHarness([], { rejectInventory: true });

    await expect(runScopeToggleScenario(input, harness.runtime, { timeoutMs: 1_000 }))
      .rejects.toThrow('target-unavailable');

    expect(harness.controls.some(message => message.payload.kind === 'toggle-scope')).toBe(false);
  });
});
