import type { PendingScopeToggle, ScopePerfTargetOptions } from './model';
import { clearPendingToggleWhenComplete } from './pending';

export function completePendingToggle(
  pending: PendingScopeToggle | undefined,
  candidate: PendingScopeToggle,
  options: Pick<ScopePerfTargetOptions, 'bridge' | 'getInventory'>,
): PendingScopeToggle | undefined {
  candidate.frame = undefined;
  if (pending !== candidate) return pending;
  const actual = options.getInventory().find(entry =>
    entry.scopeKind === candidate.entry.scopeKind
    && entry.scopeId === candidate.entry.scopeId
  );
  if (actual?.enabled !== candidate.entry.enabled) return pending;
  candidate.toggled = options.bridge.emitFor(candidate.operation, {
    kind: 'scope-toggle-complete',
    scopeProjectionRevision: candidate.projectionRevision,
    ...candidate.entry,
  });
  return clearPendingToggleWhenComplete(pending, candidate);
}
