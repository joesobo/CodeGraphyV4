export interface TimelineTimestampedCommit {
  timestamp: number;
}

export function findCommitIndexAtTime(
  commits: TimelineTimestampedCommit[],
  time: number,
): number {
  for (let index = commits.length - 1; index >= 0; index -= 1) {
    const commit = commits[index];
    if (commit && commit.timestamp <= time) {
      return index;
    }
  }

  return -1;
}

export function getCurrentCommitIndex(
  currentCommitSha: string | null,
  timelineCommits: { sha: string }[],
): number {
  if (!currentCommitSha) {
    return 0;
  }

  const index = timelineCommits.findIndex((commit) => commit.sha === currentCommitSha);
  return index === -1 ? 0 : index;
}
