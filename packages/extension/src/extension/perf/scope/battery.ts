import type { PerfMetricContext } from '@codegraphy-dev/core';

import {
  createExtensionPerfBridge,
  type ExtensionPerfBridge,
} from '../bridge';
import type { CorrelatedControlOperationRuntime } from '../controlOperation';
import type { PerfOperationDisposable } from '../operation';
import { createPerfOperation } from '../operationId';
import type {
  PerfEventPayload,
  PerfOperation,
  PerfScopeEntry,
} from '../../../shared/perf/protocol';
import {
  entryKey,
  findEntry,
  findVisibilityMismatch,
  inventoriesMatch,
} from './entries';
import {
  createInventoryWaiter,
  createToggleWaiter,
  type InventoryWaiter,
  type ToggleWaiter,
  withTimeout,
} from './waiters';

const toggleRepetitions = 3;
const defaultTimeoutMs = 180_000;

export interface RunScopeToggleScenarioInput {
  dimension: string;
  ordinal: number;
  runId: string;
}

export interface RunScopeToggleScenarioOptions {
  timeoutMs?: number;
}

export interface ScopeToggleScenarioResult {
  dimension: string;
  entryCount: number;
  operationId: string;
  scenario: 'scope-toggle';
  toggleCount: number;
}

function emitBridgeMetric(
  event: Extract<PerfEventPayload, { kind: 'metric' }>,
  runtime: Pick<CorrelatedControlOperationRuntime, 'emitMetric'>,
): void {
  const metric: PerfMetricContext = {
    operationId: event.operationId,
    runId: event.runId,
    scenario: event.scenario,
    dimension: event.dimension,
    metric: event.metric,
    value: event.value,
    unit: event.unit,
  };
  runtime.emitMetric(metric);
}

function asError(value: unknown): Error {
  return value instanceof Error ? value : new Error(String(value));
}

async function captureFailure(action: () => Promise<void>): Promise<Error | undefined> {
  try {
    await action();
    return undefined;
  } catch (error) {
    return asError(error);
  }
}

function combineFailures(
  operationId: string,
  measurementFailure: Error | undefined,
  restorationFailure: Error | undefined,
): Error | undefined {
  if (measurementFailure && restorationFailure) {
    return new Error(
      `Scope battery failed for ${operationId}: ${measurementFailure.message}; restoration also failed: ${restorationFailure.message}`,
    );
  }
  return measurementFailure ?? restorationFailure;
}

class ScopeBatteryRun {
  private readonly bridge: ExtensionPerfBridge;
  private inventoryWaiter: InventoryWaiter | undefined;
  private readonly metricSession: PerfOperationDisposable;
  private readonly subscription: PerfOperationDisposable;
  private toggleOrdinal: number;
  private toggleWaiter: ToggleWaiter | undefined;

  constructor(
    private readonly input: RunScopeToggleScenarioInput,
    private readonly operation: PerfOperation,
    private readonly runtime: CorrelatedControlOperationRuntime,
    private readonly timeoutMs: number,
  ) {
    this.toggleOrdinal = input.ordinal + 1;
    this.bridge = createExtensionPerfBridge({
      enabled: true,
      onEvent: event => { this.receive(event); },
      sendControl: message => { runtime.sendControl(message); },
    });
    this.subscription = runtime.onMessage(message => { this.bridge.handleMessage(message); });
    this.metricSession = runtime.startMetricSession(operation);
  }

  private receive(event: PerfEventPayload): void {
    if (event.kind === 'metric') emitBridgeMetric(event, this.runtime);
    this.inventoryWaiter?.receive(event);
    this.toggleWaiter?.receive(event);
  }

  private nextToggleOperation(): PerfOperation {
    const operation = createPerfOperation({
      dimension: this.input.dimension,
      ordinal: this.toggleOrdinal,
      runId: this.input.runId,
      scenario: 'scope-toggle',
    });
    this.toggleOrdinal += 1;
    return operation;
  }

  private async requestInventory(): Promise<PerfScopeEntry[]> {
    const waiter = createInventoryWaiter();
    this.inventoryWaiter = waiter;
    try {
      if (!this.bridge.armGraph(this.operation)) {
        throw new Error(`Unable to arm scope inventory for ${this.operation.operationId}`);
      }
      if (!this.bridge.requestScopeInventory()) {
        throw new Error(`Unable to request scope inventory for ${this.operation.operationId}`);
      }
      return await withTimeout(
        waiter.promise,
        this.timeoutMs,
        () => `Timed out waiting for scope-inventory for ${this.operation.operationId}`,
      );
    } finally {
      if (this.inventoryWaiter === waiter) this.inventoryWaiter = undefined;
    }
  }

  private emitToggleMetric(
    entry: PerfScopeEntry,
    operation: PerfOperation,
    elapsedMs: number,
  ): void {
    this.runtime.emitMetric({
      operationId: operation.operationId,
      runId: operation.runId,
      scenario: operation.scenario,
      dimension: entryKey(entry),
      metric: 'scopeToggleMs',
      unit: 'ms',
      value: elapsedMs,
    });
  }

  private async toggle(entry: PerfScopeEntry, measure: boolean): Promise<void> {
    const toggleOperation = this.nextToggleOperation();
    if (!this.bridge.armGraph(toggleOperation)) {
      throw new Error(`Unable to arm ${entryKey(entry)} for ${toggleOperation.operationId}`);
    }
    const startedAt = this.runtime.now();
    const waiter = createToggleWaiter(entry, () => this.runtime.now(), startedAt);
    this.toggleWaiter = waiter;
    try {
      if (!this.bridge.toggleScope(entry)) {
        throw new Error(`Unable to toggle ${entryKey(entry)} for ${this.operation.operationId}`);
      }
      const elapsedMs = await withTimeout(
        waiter.promise,
        this.timeoutMs,
        () => `Timed out waiting for ${waiter.pendingDescription()} for ${entryKey(entry)}`,
      );
      if (measure) this.emitToggleMetric(entry, toggleOperation, elapsedMs);
    } finally {
      if (this.toggleWaiter === waiter) this.toggleWaiter = undefined;
    }
  }

  private async normalizeEntry(original: PerfScopeEntry): Promise<void> {
    const current = findEntry(await this.requestInventory(), original);
    if (!current) {
      throw new Error(`Scope row ${entryKey(original)} disappeared during the battery`);
    }
    if (current.enabled !== original.enabled) await this.toggle(original, false);
  }

  private async measureEntry(original: PerfScopeEntry): Promise<void> {
    await this.normalizeEntry(original);
    for (let repetition = 0; repetition < toggleRepetitions; repetition += 1) {
      await this.toggle({ ...original, enabled: !original.enabled }, true);
      await this.toggle(original, true);
    }
  }

  private async measureEntries(entries: readonly PerfScopeEntry[]): Promise<void> {
    for (const entry of entries) await this.measureEntry(entry);
  }

  private async restoreAndVerify(expected: readonly PerfScopeEntry[]): Promise<void> {
    const maxRestorations = Math.max(1, expected.length * 2);
    for (let attempt = 0; attempt < maxRestorations; attempt += 1) {
      const current = await this.requestInventory();
      if (inventoriesMatch(expected, current)) return;
      const mismatch = findVisibilityMismatch(expected, current);
      if (!mismatch) {
        throw new Error(`Unable to restore complete scope inventory for ${this.operation.operationId}`);
      }
      await this.toggle(mismatch, false);
    }

    const finalInventory = await this.requestInventory();
    if (!inventoriesMatch(expected, finalInventory)) {
      throw new Error(`Final scope inventory does not match ${this.operation.operationId}`);
    }
  }

  async execute(): Promise<PerfScopeEntry[]> {
    const originalEntries = await this.requestInventory();
    const measurementFailure = await captureFailure(
      () => this.measureEntries(originalEntries),
    );
    const restorationFailure = await captureFailure(
      () => this.restoreAndVerify(originalEntries),
    );
    const failure = combineFailures(
      this.operation.operationId,
      measurementFailure,
      restorationFailure,
    );
    if (failure) throw failure;
    return originalEntries;
  }

  dispose(): void {
    this.bridge.disarmGraph();
    this.metricSession.dispose();
    this.subscription.dispose();
  }
}

export async function runScopeToggleScenario(
  input: RunScopeToggleScenarioInput,
  runtime: CorrelatedControlOperationRuntime,
  options: RunScopeToggleScenarioOptions = {},
): Promise<ScopeToggleScenarioResult> {
  const operation = createPerfOperation({
    dimension: input.dimension,
    ordinal: input.ordinal,
    runId: input.runId,
    scenario: 'scope-toggle',
  });
  const run = new ScopeBatteryRun(
    input,
    operation,
    runtime,
    options.timeoutMs ?? defaultTimeoutMs,
  );

  try {
    const entries = await run.execute();
    return {
      dimension: input.dimension,
      entryCount: entries.length,
      operationId: operation.operationId,
      scenario: 'scope-toggle',
      toggleCount: entries.length * toggleRepetitions * 2,
    };
  } finally {
    run.dispose();
  }
}
