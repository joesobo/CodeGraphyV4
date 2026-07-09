import {
  perfControlMessageSchema,
  perfEventMessageSchema,
  perfOperationSchema,
  type PerfControlMessage,
  type PerfEventPayload,
  type PerfOperation,
} from '../../shared/perf/protocol';

export interface ExtensionPerfBridgeOptions {
  enabled: boolean;
  sendControl(message: PerfControlMessage): void;
  onEvent(event: PerfEventPayload): void;
}

export interface ExtensionPerfBridge {
  armGraph(operation: PerfOperation): boolean;
  disarmGraph(): boolean;
  handleMessage(message: unknown): boolean;
  isArmed(): boolean;
  requestScopeInventory(): boolean;
  runIdleWatch(durationMs?: number): boolean;
  runInteractionBurst(): boolean;
  toggleScope(entry: {
    scopeKind: 'node' | 'edge';
    scopeId: string;
    enabled: boolean;
  }): boolean;
}

function belongsToOperation(event: PerfEventPayload, operation: PerfOperation): boolean {
  const belongsToContext = event.operationId === operation.operationId
    && event.runId === operation.runId
    && event.scenario === operation.scenario;
  if (!belongsToContext) {
    return false;
  }

  return event.kind === 'metric' && event.metric === 'scopeToggleMs'
    ? true
    : event.dimension === operation.dimension;
}

export function createExtensionPerfBridge(
  options: ExtensionPerfBridgeOptions,
): ExtensionPerfBridge {
  let armedOperation: PerfOperation | undefined;

  return {
    armGraph(operation): boolean {
      if (!options.enabled) {
        return false;
      }

      const parsedOperation = perfOperationSchema.safeParse(operation);
      if (!parsedOperation.success) {
        return false;
      }

      const message = perfControlMessageSchema.parse({
        type: 'PERF_CONTROL',
        payload: {
          kind: 'arm-graph',
          operation: parsedOperation.data,
        },
      });
      options.sendControl(message);
      armedOperation = parsedOperation.data;
      return true;
    },

    disarmGraph(): boolean {
      if (!options.enabled || !armedOperation) {
        return false;
      }

      const message = perfControlMessageSchema.parse({
        type: 'PERF_CONTROL',
        payload: {
          kind: 'disarm-graph',
          operationId: armedOperation.operationId,
        },
      });
      options.sendControl(message);
      armedOperation = undefined;
      return true;
    },

    handleMessage(message): boolean {
      if (!options.enabled || !armedOperation) {
        return false;
      }

      const parsedMessage = perfEventMessageSchema.safeParse(message);
      if (!parsedMessage.success) {
        return false;
      }
      if (!belongsToOperation(parsedMessage.data.payload, armedOperation)) {
        return false;
      }

      options.onEvent(parsedMessage.data.payload);
      return true;
    },

    isArmed(): boolean {
      return options.enabled && armedOperation !== undefined;
    },

    requestScopeInventory(): boolean {
      if (!options.enabled || !armedOperation) {
        return false;
      }
      const message = perfControlMessageSchema.parse({
        type: 'PERF_CONTROL',
        payload: {
          kind: 'request-scope-inventory',
          operationId: armedOperation.operationId,
        },
      });
      options.sendControl(message);
      return true;
    },

    runIdleWatch(durationMs): boolean {
      if (!options.enabled || !armedOperation) {
        return false;
      }
      const message = perfControlMessageSchema.safeParse({
        type: 'PERF_CONTROL',
        payload: {
          kind: 'run-idle-watch',
          operationId: armedOperation.operationId,
          ...(durationMs === undefined ? {} : { durationMs }),
        },
      });
      if (!message.success) {
        return false;
      }
      options.sendControl(message.data);
      return true;
    },

    runInteractionBurst(): boolean {
      if (!options.enabled || !armedOperation) {
        return false;
      }
      const message = perfControlMessageSchema.parse({
        type: 'PERF_CONTROL',
        payload: {
          kind: 'run-interaction-burst',
          operationId: armedOperation.operationId,
        },
      });
      options.sendControl(message);
      return true;
    },

    toggleScope(entry): boolean {
      if (!options.enabled || !armedOperation) {
        return false;
      }
      const message = perfControlMessageSchema.safeParse({
        type: 'PERF_CONTROL',
        payload: {
          kind: 'toggle-scope',
          operationId: armedOperation.operationId,
          ...entry,
        },
      });
      if (!message.success) {
        return false;
      }
      options.sendControl(message.data);
      return true;
    },
  };
}
