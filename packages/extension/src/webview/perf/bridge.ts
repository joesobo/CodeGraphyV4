import {
  perfControlMessageSchema,
  perfEventMessageSchema,
  type PerfEventInput,
  type PerfEventMessage,
  type PerfOperation,
} from '../../shared/perf/protocol';
import { postMessage } from '../vscodeApi';

export interface WebviewPerfBridgeOptions {
  postMessage(message: PerfEventMessage): void;
}

export interface WebviewPerfBridge {
  emit(event: PerfEventInput): boolean;
  emitFor(operation: PerfOperation, event: PerfEventInput): boolean;
  getArmedOperation(): PerfOperation | undefined;
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

  const emitFor = (operation: PerfOperation, event: PerfEventInput): boolean => {
    if (armedOperation !== operation) {
      return false;
    }

    const message = perfEventMessageSchema.safeParse({
      type: 'PERF_EVENT',
      payload: {
        ...operation,
        ...event,
      },
    });
    if (!message.success) {
      return false;
    }

    options.postMessage(message.data);
    return true;
  };

  return {
    emit(event): boolean {
      if (!armedOperation) {
        return false;
      }
      return emitFor(armedOperation, event);
    },

    emitFor,

    getArmedOperation(): PerfOperation | undefined {
      return armedOperation;
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

      if (control.kind === 'disarm-graph') {
        if (armedOperation?.operationId === control.operationId) {
          armedOperation = undefined;
        }
        return true;
      }

      return armedOperation?.operationId === control.operationId;
    },

    isArmed(): boolean {
      return armedOperation !== undefined;
    },
  };
}

export const webviewPerfBridge = createWebviewPerfBridge({ postMessage });
