export interface TimelineTimestampedCommit {
  timestamp: number;
}

export function findCommitIndexAtTime(
  commits: TimelineTimestampedCommit[],
  time: number,
): number {
  let low = 0;
  let high = commits.length - 1;
  let result = -1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    if (commits[mid].timestamp <= time) {
      result = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return result;
}

export function getCurrentCommitIndex(
  currentCommitSha: string | null,
  timelineCommits: { sha: string }[],
): number {
  if (!currentCommitSha || timelineCommits.length === 0) {
    return 0;
  }

  const index = timelineCommits.findIndex((commit) => commit.sha === currentCommitSha);
  return index >= 0 ? index : 0;
}
