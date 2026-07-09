import type {
  PerfOperation,
  PerfScopeEntry,
} from '../../../shared/perf/protocol';
import {
  applyGraphScopeVisibility,
  getGraphControlsScopeEnabled,
  getGraphScopeInventory,
} from '../../components/graphScope/visibility';
import { webviewPerfBridge, type WebviewPerfBridge } from '../bridge';
import type { ScopePerfScenarioTarget } from '../graph/control';

interface ScopePerfTargetOptions {
  applyVisibility: (entry: PerfScopeEntry, onPosted?: () => void) => boolean;
  bridge: Pick<WebviewPerfBridge, 'emitFor'>;
  cancelFrame: (frame: number) => void;
  getInventory: () => PerfScopeEntry[];
  requestFrame: (callback: FrameRequestCallback) => number;
}

interface PendingScopeToggle {
  entry: PerfScopeEntry;
  frame: number | undefined;
  operation: PerfOperation;
  persisted: boolean;
  posted: boolean;
  toggled: boolean;
}

export function createScopePerfTarget({
  applyVisibility,
  bridge,
  cancelFrame,
  getInventory,
  requestFrame,
}: ScopePerfTargetOptions): ScopePerfScenarioTarget {
  let pending: PendingScopeToggle | undefined;

  const clearWhenComplete = (candidate: PendingScopeToggle): void => {
    if (pending === candidate && candidate.toggled && candidate.persisted) {
      pending = undefined;
    }
  };

  return {
    cancel(): void {
      if (pending?.frame !== undefined) {
        cancelFrame(pending.frame);
      }
      pending = undefined;
    },

    graphControlsUpdated(snapshot): void {
      const candidate = pending;
      if (!candidate || !candidate.posted || candidate.persisted) {
        return;
      }
      if (getGraphControlsScopeEnabled(snapshot, candidate.entry) !== candidate.entry.enabled) {
        return;
      }
      // GRAPH_CONTROLS_UPDATED is sent after the host awaits configuration.update.
      // This acknowledges host-observed persistence, not a filesystem fsync guarantee.
      candidate.persisted = bridge.emitFor(candidate.operation, {
        kind: 'scope-persist-complete',
        ...candidate.entry,
      });
      clearWhenComplete(candidate);
    },

    requestInventory(operation): void {
      bridge.emitFor(operation, {
        kind: 'scope-inventory',
        entries: getInventory(),
      });
    },

    toggle(operation, entry): boolean {
      if (pending) {
        return false;
      }

      const candidate: PendingScopeToggle = {
        entry,
        frame: undefined,
        operation,
        persisted: false,
        posted: false,
        toggled: false,
      };
      pending = candidate;
      const applied = applyVisibility(entry, () => {
        if (pending === candidate) {
          candidate.posted = true;
        }
      });
      if (!applied) {
        pending = undefined;
        return false;
      }

      candidate.frame = requestFrame(() => {
        candidate.frame = undefined;
        if (pending !== candidate) {
          return;
        }
        const actual = getInventory().find(current =>
          current.scopeKind === entry.scopeKind && current.scopeId === entry.scopeId
        );
        if (actual?.enabled !== entry.enabled) {
          return;
        }
        candidate.toggled = bridge.emitFor(operation, {
          kind: 'scope-toggle-complete',
          ...entry,
        });
        clearWhenComplete(candidate);
      });
      return true;
    },
  };
}

export const webviewScopePerfTarget = createScopePerfTarget({
  applyVisibility: applyGraphScopeVisibility,
  bridge: webviewPerfBridge,
  cancelFrame: frame => cancelAnimationFrame(frame),
  getInventory: getGraphScopeInventory,
  requestFrame: callback => requestAnimationFrame(callback),
});
