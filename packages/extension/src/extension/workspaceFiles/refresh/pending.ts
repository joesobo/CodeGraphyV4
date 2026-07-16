import type { PendingWorkspaceRefresh } from './contracts';

function maxFollowUpDelay(
  left: number | undefined,
  right: number | undefined,
): number | undefined {
  if (left === undefined) return right;
  if (right === undefined) return left;
  return Math.max(left, right);
}

export function mergePendingRefresh(
  pending: PendingWorkspaceRefresh | undefined,
  filePaths: Set<string>,
  options: { followUpDelayMs?: number; fullRefresh?: boolean; gitignoreRefresh?: boolean },
): Pick<PendingWorkspaceRefresh, 'filePaths' | 'followUpDelayMs' | 'fullRefresh' | 'gitignoreRefresh'> {
  if (!pending) {
    return {
      filePaths,
      followUpDelayMs: options.followUpDelayMs,
      fullRefresh: options.fullRefresh === true,
      gitignoreRefresh: options.gitignoreRefresh === true,
    };
  }
  clearTimeout(pending.timeout);
  for (const filePath of pending.filePaths) filePaths.add(filePath);
  return {
    filePaths,
    followUpDelayMs: maxFollowUpDelay(options.followUpDelayMs, pending.followUpDelayMs),
    fullRefresh: options.fullRefresh === true || pending.fullRefresh,
    gitignoreRefresh: options.gitignoreRefresh === true || pending.gitignoreRefresh,
  };
}
