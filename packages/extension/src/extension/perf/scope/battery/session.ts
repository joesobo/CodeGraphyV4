import {
  createExtensionPerfBridge,
  type ExtensionPerfBridge,
} from '../../bridge';
import type { CorrelatedControlOperationRuntime } from '../../controlOperation';
import type { PerfOperationDisposable } from '../../operation';
import { createPerfOperation } from '../../operationId';
import type {
  PerfEventPayload,
  PerfOperation,
  PerfScopeEntry,
} from '../../../../shared/perf/protocol';
import { entryKey } from '../entries';
import {
  createInventoryWaiter,
  createToggleWaiter,
  type InventoryWaiter,
  type ToggleWaiter,
  withTimeout,
} from '../waiters';
import { executeScopeBattery } from './execution';
import {
  createScopeMetricRecorder,
  type ScopeMetricRecorder,
} from './metrics';

interface ScopeBatterySessionInput {
  dimension: string;
  ordinal: number;
  runId: string;
}

export interface ScopeBatterySession {
  dispose(): void;
  execute(): Promise<PerfScopeEntry[]>;
}

class DefaultScopeBatterySession implements ScopeBatterySession {
  private readonly bridge: ExtensionPerfBridge;
  private inventoryWaiter: InventoryWaiter | undefined;
  private readonly metrics: ScopeMetricRecorder;
  private readonly metricSession: PerfOperationDisposable;
  private readonly subscription: PerfOperationDisposable;
  private toggleOrdinal: number;
  private toggleWaiter: ToggleWaiter | undefined;

  constructor(
    private readonly input: ScopeBatterySessionInput,
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
    this.metrics = createScopeMetricRecorder(runtime);
  }

  private receive(event: PerfEventPayload): void {
    this.metrics.receive(event);
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

  private async toggle(entry: PerfScopeEntry, measure: boolean): Promise<void> {
    const toggleOperation = this.nextToggleOperation();
    if (measure) this.metrics.markMeasured(toggleOperation);
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
      if (measure) this.metrics.recordToggle(entry, toggleOperation, elapsedMs);
    } finally {
      if (this.toggleWaiter === waiter) this.toggleWaiter = undefined;
    }
  }

  async execute(): Promise<PerfScopeEntry[]> {
    return executeScopeBattery({
      operationId: this.operation.operationId,
      requestInventory: () => this.requestInventory(),
      toggle: (entry, measured) => this.toggle(entry, measured),
    });
  }

  dispose(): void {
    this.bridge.disarmGraph();
    this.metricSession.dispose();
    this.subscription.dispose();
  }
}

export function createScopeBatterySession(
  input: ScopeBatterySessionInput,
  operation: PerfOperation,
  runtime: CorrelatedControlOperationRuntime,
  timeoutMs: number,
): ScopeBatterySession {
  return new DefaultScopeBatterySession(input, operation, runtime, timeoutMs);
}
