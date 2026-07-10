import type { IGraphControlsSnapshot } from '../../../../shared/graphControls/contracts';
import { getGraphControlsScopeEnabled } from '../../../components/graphScope/visibility';
import type { PendingScopeToggle, ScopePerfTargetOptions } from './model';
import { clearPendingToggleWhenComplete } from './pending';

export function receivePendingPersistence(
  pending: PendingScopeToggle | undefined,
  snapshot: IGraphControlsSnapshot,
  bridge: ScopePerfTargetOptions['bridge'],
): PendingScopeToggle | undefined {
  if (!pending || !pending.posted || pending.persisted) return pending;
  if (getGraphControlsScopeEnabled(snapshot, pending.entry) !== pending.entry.enabled) {
    return pending;
  }
  // GRAPH_CONTROLS_UPDATED is sent after the host awaits configuration.update.
  // This acknowledges host-observed persistence, not a filesystem fsync guarantee.
  pending.persisted = bridge.emitFor(pending.operation, {
    kind: 'scope-persist-complete',
    ...pending.entry,
  });
  return clearPendingToggleWhenComplete(pending, pending);
}
