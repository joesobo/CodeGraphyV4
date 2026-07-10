import type {
  PerfOperation,
  PerfScopeEntry,
} from '../../../shared/perf/protocol';
import {
  applyGraphScopeVisibility,
  getGraphScopeProjectionRevision,
  getGraphScopeInventory,
} from '../../components/graphScope/visibility';
import { webviewPerfBridge } from '../bridge';
import type { ScopePerfScenarioTarget } from '../graph/control';
import { completePendingToggle } from './target/completion';
import {
  createPendingScopeToggle,
  type PendingScopeToggle,
  type ScopePerfTargetOptions,
} from './target/model';
import {
  cancelPendingToggle,
  markPendingTogglePosted,
} from './target/pending';
import { receivePendingPersistence } from './target/persistence';

class DefaultScopePerfTarget implements ScopePerfScenarioTarget {
  private pending: PendingScopeToggle | undefined;

  constructor(private readonly options: ScopePerfTargetOptions) {}

  cancel(): void {
    this.pending = cancelPendingToggle(this.pending, this.options.cancelFrame);
  }

  graphControlsUpdated(snapshot: Parameters<ScopePerfScenarioTarget['graphControlsUpdated']>[0]): void {
    this.pending = receivePendingPersistence(this.pending, snapshot, this.options.bridge);
  }

  requestInventory(operation: PerfOperation): void {
    this.options.bridge.emitFor(operation, {
      kind: 'scope-inventory',
      entries: this.options.getInventory(),
    });
  }

  toggle(operation: PerfOperation, entry: PerfScopeEntry): boolean {
    if (this.pending) return false;
    const candidate = createPendingScopeToggle(operation, entry);
    this.pending = candidate;
    if (!this.options.applyVisibility(
      entry,
      () => { markPendingTogglePosted(this.pending, candidate); },
    )) {
      this.pending = undefined;
      return false;
    }
    candidate.projectionRevision = this.options.getProjectionRevision();
    candidate.frame = this.options.requestFrame(() => {
      this.pending = completePendingToggle(this.pending, candidate, this.options);
    });
    return true;
  }
}

export function createScopePerfTarget(
  options: ScopePerfTargetOptions,
): ScopePerfScenarioTarget {
  return new DefaultScopePerfTarget(options);
}

export const webviewScopePerfTarget = createScopePerfTarget({
  applyVisibility: applyGraphScopeVisibility,
  bridge: webviewPerfBridge,
  cancelFrame: frame => cancelAnimationFrame(frame),
  getInventory: getGraphScopeInventory,
  getProjectionRevision: getGraphScopeProjectionRevision,
  requestFrame: callback => requestAnimationFrame(callback),
});
