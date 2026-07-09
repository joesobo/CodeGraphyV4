import {
  perfControlMessageSchema,
  type PerfOperation,
} from '../../../shared/perf/protocol';
import {
  webviewPerfBridge,
  type WebviewPerfBridge,
} from '../bridge';
import { DEFAULT_IDLE_WATCH_DURATION_MS } from './scenarios';

export interface GraphPerfScenarioTarget {
  cancel: () => void;
  engineStopped: () => void;
  engineTick: () => void;
  startIdleWatch: (operation: PerfOperation, durationMs: number) => void;
  startInteractionBurst: (operation: PerfOperation) => void;
}

export interface WebviewGraphPerfControl {
  attachTarget: (target: GraphPerfScenarioTarget) => () => void;
  engineStopped: () => void;
  getTarget: () => GraphPerfScenarioTarget | undefined;
  handleControl: (message: unknown) => boolean;
}

interface WebviewGraphPerfControlOptions {
  bridge: Pick<
    WebviewPerfBridge,
    'getArmedOperation' | 'handleControl'
  >;
}

export function createWebviewGraphPerfControl({
  bridge,
}: WebviewGraphPerfControlOptions): WebviewGraphPerfControl {
  let target: GraphPerfScenarioTarget | undefined;

  return {
    attachTarget(nextTarget): () => void {
      target?.cancel();
      target = nextTarget;

      return () => {
        if (target !== nextTarget) {
          return;
        }
        nextTarget.cancel();
        target = undefined;
      };
    },

    engineStopped(): void {
      target?.engineStopped();
    },

    getTarget(): GraphPerfScenarioTarget | undefined {
      return target;
    },

    handleControl(message): boolean {
      const parsed = perfControlMessageSchema.safeParse(message);
      if (!parsed.success) {
        return false;
      }

      const control = parsed.data.payload;
      const currentOperation = bridge.getArmedOperation();
      if (control.kind === 'arm-graph') {
        target?.cancel();
        return bridge.handleControl(message);
      }

      if (control.kind === 'disarm-graph') {
        if (currentOperation?.operationId === control.operationId) {
          target?.cancel();
        }
        return bridge.handleControl(message);
      }

      if (!bridge.handleControl(message)) {
        return false;
      }

      const operation = bridge.getArmedOperation();
      if (!operation || operation.operationId !== control.operationId) {
        return false;
      }

      if (control.kind === 'run-interaction-burst') {
        target?.startInteractionBurst(operation);
        return true;
      }

      target?.startIdleWatch(
        operation,
        control.durationMs ?? DEFAULT_IDLE_WATCH_DURATION_MS,
      );
      return true;
    },
  };
}

export const webviewGraphPerfControl = createWebviewGraphPerfControl({
  bridge: webviewPerfBridge,
});
