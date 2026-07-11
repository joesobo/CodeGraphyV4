import {
  perfControlMessageSchema,
  type PerfOperation,
  type PerfScopeEntry,
} from '../../../shared/perf/protocol';
import type { IGraphControlsSnapshot } from '../../../shared/graphControls/contracts';
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

export interface ScopePerfScenarioTarget {
  cancel: () => void;
  graphControlsUpdated: (snapshot: IGraphControlsSnapshot) => void;
  requestInventory: (operation: PerfOperation) => void;
  toggle: (operation: PerfOperation, entry: PerfScopeEntry) => boolean;
}

export interface WebviewGraphPerfControl {
  attachScopeTarget: (target: ScopePerfScenarioTarget) => () => void;
  attachTarget: (target: GraphPerfScenarioTarget) => () => void;
  engineStopped: () => void;
  getTarget: () => GraphPerfScenarioTarget | undefined;
  handleControl: (message: unknown) => boolean;
  handleExtensionMessage: (message: unknown) => boolean;
}

interface WebviewGraphPerfControlOptions {
  bridge: Pick<
    WebviewPerfBridge,
    'emitFor' | 'getArmedOperation' | 'handleControl'
  >;
}

export function createWebviewGraphPerfControl({
  bridge,
}: WebviewGraphPerfControlOptions): WebviewGraphPerfControl {
  let target: GraphPerfScenarioTarget | undefined;
  let scopeTarget: ScopePerfScenarioTarget | undefined;
  let graphSettled = false;

  return {
    attachScopeTarget(nextTarget): () => void {
      scopeTarget?.cancel();
      scopeTarget = nextTarget;

      return () => {
        if (scopeTarget !== nextTarget) {
          return;
        }
        nextTarget.cancel();
        scopeTarget = undefined;
      };
    },

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
      graphSettled = true;
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
        scopeTarget?.cancel();
        return bridge.handleControl(message);
      }

      if (control.kind === 'disarm-graph') {
        if (currentOperation?.operationId === control.operationId) {
          target?.cancel();
          scopeTarget?.cancel();
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
        graphSettled = false;
        target?.startInteractionBurst(operation);
        return true;
      }

      if (control.kind === 'run-idle-watch') {
        target?.startIdleWatch(
          operation,
          control.durationMs ?? DEFAULT_IDLE_WATCH_DURATION_MS,
        );
        if (graphSettled) target?.engineStopped();
        return true;
      }

      if (control.kind === 'request-scope-inventory') {
        if (scopeTarget) {
          scopeTarget.requestInventory(operation);
        } else {
          bridge.emitFor(operation, {
            kind: 'scope-inventory-rejected',
            reason: 'target-unavailable',
          });
        }
        return true;
      }

      const entry = {
        scopeKind: control.scopeKind,
        scopeId: control.scopeId,
        enabled: control.enabled,
      };
      const rejectionReason = scopeTarget
        ? scopeTarget.toggle(operation, entry) ? undefined : 'toggle-unavailable'
        : 'target-unavailable';
      if (rejectionReason) {
        bridge.emitFor(operation, {
          kind: 'scope-toggle-rejected',
          ...entry,
          reason: rejectionReason,
        });
      }
      return true;
    },

    handleExtensionMessage(message): boolean {
      if (!bridge.getArmedOperation()) {
        return false;
      }
      if (
        !message
        || typeof message !== 'object'
        || (message as { type?: unknown }).type !== 'GRAPH_CONTROLS_UPDATED'
      ) {
        return false;
      }
      const snapshot = (message as { payload?: unknown }).payload;
      if (!snapshot || typeof snapshot !== 'object') {
        return false;
      }
      scopeTarget?.graphControlsUpdated(snapshot as IGraphControlsSnapshot);
      return true;
    },
  };
}

export const webviewGraphPerfControl = createWebviewGraphPerfControl({
  bridge: webviewPerfBridge,
});
