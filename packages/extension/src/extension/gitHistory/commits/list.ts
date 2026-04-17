import type { ICommitInfo } from '../../../shared/timeline/contracts';

export interface CommitListGit {
  execGit(args: string[], signal: AbortSignal): Promise<string>;
}

export function parseCommitList(output: string): ICommitInfo[] {
  const lines = output.trim().split('\n').filter(Boolean);
  const commits: ICommitInfo[] = [];

  for (const line of lines) {
    const parts = line.split('|', 5);
    if (parts.length < 4) {
      continue;
    }

    const [sha, timestampStr, message, author, parentsStr] = parts;
    commits.push({
      sha,
      timestamp: parseInt(timestampStr, 10),
      message,
      author,
      parents: parentsStr ? parentsStr.split(' ').filter(Boolean) : [],
    });
  }

  commits.reverse();
  return commits;
}

export async function getCommitList(
  git: CommitListGit,
  maxCommits: number,
  signal: AbortSignal
): Promise<ICommitInfo[]> {
  const defaultBranch = (await git.execGit(['rev-parse', '--abbrev-ref', 'HEAD'], signal)).trim();

  const output = await git.execGit(
    [
      'log',
      '--first-parent',
      defaultBranch,
      '--format=%H|%at|%s|%an|%P',
      '-n',
      String(maxCommits),
    ],
    signal
  );

  return parseCommitList(output);
}
