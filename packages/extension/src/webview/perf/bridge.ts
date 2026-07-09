import {
  perfControlMessageSchema,
  perfEventMessageSchema,
  type PerfEventInput,
  type PerfEventMessage,
  type PerfOperation,
} from '../../shared/perf/protocol';

export interface WebviewPerfBridgeOptions {
  postMessage(message: PerfEventMessage): void;
}

export interface WebviewPerfBridge {
  emit(event: PerfEventInput): boolean;
  handleControl(message: unknown): boolean;
  isArmed(): boolean;
}

function isPerfControlCandidate(message: unknown): boolean {
  return typeof message === 'object'
    && message !== null
    && (message as { type?: unknown }).type === 'PERF_CONTROL';
}

export function createWebviewPerfBridge(
  options: WebviewPerfBridgeOptions,
): WebviewPerfBridge {
  let armedOperation: PerfOperation | undefined;

  return {
    emit(event): boolean {
      if (!armedOperation) {
        return false;
      }

      const message = perfEventMessageSchema.safeParse({
        type: 'PERF_EVENT',
        payload: {
          ...event,
          ...armedOperation,
        },
      });
      if (!message.success) {
        return false;
      }

      options.postMessage(message.data);
      return true;
    },

    handleControl(message): boolean {
      if (!isPerfControlCandidate(message)) {
        return false;
      }

      const parsedMessage = perfControlMessageSchema.safeParse(message);
      if (!parsedMessage.success) {
        return false;
      }

      const control = parsedMessage.data.payload;
      if (control.kind === 'arm-graph') {
        armedOperation = control.operation;
        return true;
      }

      if (armedOperation?.operationId === control.operationId) {
        armedOperation = undefined;
      }
      return true;
    },

    isArmed(): boolean {
      return armedOperation !== undefined;
    },
  };
}
