import { describe, expect, it } from 'vitest';
import { getCommitList, parseCommitList } from '../../../../src/extension/gitHistory/commits/list';

describe('gitHistory/commits/list', () => {
  it('parses commit list output into oldest-first order', () => {
    expect(
      parseCommitList(
        [
          'sha-2|200|message-2|author-2|parent-2',
          'sha-1|100|message-1|author-1|',
        ].join('\n'),
      ),
    ).toEqual([
      {
        sha: 'sha-1',
        timestamp: 100,
        message: 'message-1',
        author: 'author-1',
        parents: [],
      },
      {
        sha: 'sha-2',
        timestamp: 200,
        message: 'message-2',
        author: 'author-2',
        parents: ['parent-2'],
      },
    ]);
  });

  it('skips malformed rows but keeps four-field rows without parents', () => {
    expect(
      parseCommitList(
        [
          '',
          'invalid-row',
          'sha-2|200|message-2|author-2',
          'sha-1|100|message-1|author-1|',
          '',
        ].join('\n'),
      ),
    ).toEqual([
      {
        sha: 'sha-1',
        timestamp: 100,
        message: 'message-1',
        author: 'author-1',
        parents: [],
      },
      {
        sha: 'sha-2',
        timestamp: 200,
        message: 'message-2',
        author: 'author-2',
        parents: [],
      },
    ]);
  });

  it('trims surrounding whitespace from the command output', () => {
    expect(
      parseCommitList('  \nsha-1|100|message-1|author-1|\nsha-2|200|message-2|author-2|parent-1\n  '),
    ).toEqual([
      {
        sha: 'sha-2',
        timestamp: 200,
        message: 'message-2',
        author: 'author-2',
        parents: ['parent-1'],
      },
      {
        sha: 'sha-1',
        timestamp: 100,
        message: 'message-1',
        author: 'author-1',
        parents: [],
      },
    ]);
  });

  it('filters empty parent entries when multiple spaces separate parent shas', () => {
    expect(parseCommitList('sha-1|100|message-1|author-1|parent-1  parent-2   parent-3')).toEqual([
      {
        sha: 'sha-1',
        timestamp: 100,
        message: 'message-1',
        author: 'author-1',
        parents: ['parent-1', 'parent-2', 'parent-3'],
      },
    ]);
  });

  it('requests the current default branch before fetching history', async () => {
    const calls: Array<{ args: string[]; signal: AbortSignal }> = [];
    const signal = new AbortController().signal;
    const execGit = async (args: string[]) => {
      calls.push({ args, signal });
      if (args[0] === 'rev-parse') {
        return 'main\n';
      }

      expect(args).toEqual([
        'log',
        '--topo-order',
        '--date-order',
        'main',
        '--format=%H|%at|%s|%an|%P',
        '-n',
        '2',
      ]);
      return 'sha-2|200|message-2|author-2|sha-1\nsha-1|100|message-1|author-1|';
    };

    await expect(getCommitList({ execGit }, 2, signal)).resolves.toEqual([
      {
        sha: 'sha-1',
        timestamp: 100,
        message: 'message-1',
        author: 'author-1',
        parents: [],
      },
      {
        sha: 'sha-2',
        timestamp: 200,
        message: 'message-2',
        author: 'author-2',
        parents: ['sha-1'],
      },
    ]);

    expect(calls[0]).toEqual({
      args: ['rev-parse', '--abbrev-ref', 'HEAD'],
      signal,
    });
  });

  it('preserves non-linear commits reachable from the current branch', async () => {
    const signal = new AbortController().signal;
    const execGit = async (args: string[]) => {
      if (args[0] === 'rev-parse') {
        return 'main\n';
      }

      expect(args).toContain('--topo-order');
      expect(args).toContain('--date-order');
      expect(args).not.toContain('--first-parent');

      return [
        'merge|400|Merge feature|Alice|main-2 feature-1',
        'feature-1|300|Feature work|Bob|root',
        'main-2|200|Main work|Alice|root',
        'root|100|Initial|Alice|',
      ].join('\n');
    };

    await expect(getCommitList({ execGit }, 4, signal)).resolves.toEqual([
      {
        sha: 'root',
        timestamp: 100,
        message: 'Initial',
        author: 'Alice',
        parents: [],
      },
      {
        sha: 'main-2',
        timestamp: 200,
        message: 'Main work',
        author: 'Alice',
        parents: ['root'],
      },
      {
        sha: 'feature-1',
        timestamp: 300,
        message: 'Feature work',
        author: 'Bob',
        parents: ['root'],
      },
      {
        sha: 'merge',
        timestamp: 400,
        message: 'Merge feature',
        author: 'Alice',
        parents: ['main-2', 'feature-1'],
      },
    ]);
  });
});
