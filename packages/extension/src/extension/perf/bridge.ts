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
  runIdleWatch(durationMs?: number): boolean;
  runInteractionBurst(): boolean;
}

function belongsToOperation(event: PerfEventPayload, operation: PerfOperation): boolean {
  return event.operationId === operation.operationId
    && event.runId === operation.runId
    && event.scenario === operation.scenario
    && event.dimension === operation.dimension;
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
  };
}
