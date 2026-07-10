import type { PendingScopeToggle } from './model';

export function clearPendingToggleWhenComplete(
  pending: PendingScopeToggle | undefined,
  candidate: PendingScopeToggle,
): PendingScopeToggle | undefined {
  return pending === candidate && candidate.toggled && candidate.persisted
    ? undefined
    : pending;
}

export function markPendingTogglePosted(
  pending: PendingScopeToggle | undefined,
  candidate: PendingScopeToggle,
): void {
  if (pending === candidate) candidate.posted = true;
}

export function cancelPendingToggle(
  pending: PendingScopeToggle | undefined,
  cancelFrame: (frame: number) => void,
): undefined {
  if (pending?.frame !== undefined) cancelFrame(pending.frame);
  return undefined;
}
