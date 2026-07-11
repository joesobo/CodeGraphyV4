import type { ToggleWaiterState } from './model';

export function isToggleReady(state: ToggleWaiterState): boolean {
  if (!state.graphApplied || state.graphAppliedElapsedMs === undefined) return false;
  if (!state.toggled || !state.persisted) return false;
  return true;
}

export function completeToggleWhenReady(
  state: ToggleWaiterState,
  resolve: (elapsedMs: number) => void,
): void {
  if (!isToggleReady(state)) return;
  resolve(state.graphAppliedElapsedMs!);
}

export function pendingToggleEvents(state: ToggleWaiterState): string {
  const pending: string[] = [];
  if (!state.toggled) pending.push('scope-toggle-complete');
  if (!state.persisted) pending.push('scope-persist-complete');
  if (!state.graphApplied) pending.push('graph-applied');
  return pending.join(', ');
}
